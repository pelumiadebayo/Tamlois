"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackWebhook = exports.bookingApi = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const app_check_1 = require("firebase-admin/app-check");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const paystackSecret = (0, params_1.defineSecret)("PAYSTACK_SECRET_KEY");
const publicSiteOrigin = (0, params_1.defineString)("PUBLIC_SITE_ORIGIN", {
    default: "http://localhost:5173",
});
const allowedOrigin = (0, params_1.defineString)("BOOKING_ALLOWED_ORIGIN", {
    default: "http://localhost:5173",
});
const requireAppCheck = (0, params_1.defineBoolean)("REQUIRE_APP_CHECK", { default: false });
const DEFAULT_HOLD_MINUTES = 15;
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
function json(res, status, body) {
    res.status(status).json(body);
}
function text(value, name, max = 500) {
    if (typeof value !== "string" || !value.trim() || value.length > max) {
        throw new ApiError(400, `${name} is invalid.`);
    }
    return value.trim();
}
function optionalText(value, max = 2000) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function stringArray(value, name) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new ApiError(400, `${name} is invalid.`);
    }
    return [...new Set(value)];
}
function minutes(time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new ApiError(400, "Start time is invalid.");
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
}
function clock(total) {
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function zonedDateTimeMs(date, time, timezone) {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const nominal = Date.UTC(year, month - 1, day, hour, minute);
    let candidate = nominal;
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    for (let pass = 0; pass < 2; pass += 1) {
        const parts = Object.fromEntries(formatter
            .formatToParts(new Date(candidate))
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]));
        const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
        candidate -= rendered - nominal;
    }
    return candidate;
}
function validateSchedule(date, startTime, duration, settings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new ApiError(400, "Date is invalid.");
    const day = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date)
        throw new ApiError(400, "Date is invalid.");
    const start = minutes(startTime);
    const protectedEnd = start + duration + settings.bufferMinutes;
    const opening = settings.openingHour * 60;
    const closing = settings.closingHour * 60;
    if (settings.closedDays.includes(day.getUTCDay()) ||
        start < opening ||
        protectedEnd > closing ||
        (start - opening) % settings.bookingInterval !== 0)
        throw new ApiError(409, "That time is outside clinic availability.");
    const appointmentMs = zonedDateTimeMs(date, startTime, settings.timezone);
    if (appointmentMs < Date.now() + settings.minimumNoticeHours * 3_600_000)
        throw new ApiError(409, "That time does not meet the minimum booking notice.");
    if (appointmentMs > Date.now() + settings.maximumAdvanceDays * 86_400_000)
        throw new ApiError(409, "That date is beyond the advance booking window.");
    const blocked = settings.blockedPeriods.some((period) => {
        if (period.date !== date)
            return false;
        if (!period.start || !period.end)
            return true;
        return (start < minutes(String(period.end)) &&
            protectedEnd > minutes(String(period.start)));
    });
    if (blocked)
        throw new ApiError(409, "That time is blocked by the clinic.");
}
function lockIds(date, start, duration, interval, buffer) {
    const ids = [];
    for (let cursor = minutes(start); cursor < minutes(start) + duration + buffer; cursor += interval) {
        ids.push(`slot--${date}--${clock(cursor).replace(":", "-")}`);
    }
    return ids;
}
const SALON_SESSIONS = [
    { startTime: "09:00", endTime: "12:00", capacity: 3 },
    { startTime: "12:00", endTime: "15:00", capacity: 3 },
    { startTime: "15:00", endTime: "18:00", capacity: 3 },
];
function salonSession(startTime) {
    return SALON_SESSIONS.find((session) => session.startTime === startTime);
}
function salonCapacityLockIds(date, startTime) {
    return Array.from({ length: 3 }, (_, index) => `salon--${date}--${startTime.replace(":", "-")}--${index + 1}`);
}
function requestOrigin(req) {
    return typeof req.headers.origin === "string" ? req.headers.origin : "";
}
function applyCors(req, res) {
    const origin = requestOrigin(req);
    if (origin && origin === allowedOrigin.value()) {
        res.set("Access-Control-Allow-Origin", origin);
        res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Headers", "Content-Type,X-Firebase-AppCheck");
    res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.set("Cache-Control", "no-store");
}
async function publicSettings() {
    const snapshot = await db.doc("businessSettings/public").get();
    const value = snapshot.data() || {};
    const payment = (value.payment || {});
    return {
        timezone: String(value.timezone || "Africa/Lagos"),
        bookingInterval: Number(value.bookingInterval || 30),
        bufferMinutes: Number(value.bufferMinutes || 15),
        minimumNoticeHours: Number(value.minimumNoticeHours || 4),
        maximumAdvanceDays: Number(value.maximumAdvanceDays || 60),
        openingHour: Number(value.openingHour || 9),
        closingHour: Number(value.closingHour || 18),
        closedDays: Array.isArray(value.closedDays)
            ? value.closedDays.map(Number)
            : [0],
        blockedPeriods: Array.isArray(value.blockedPeriods)
            ? value.blockedPeriods
            : [],
        holdMinutes: Number(payment.holdMinutes || DEFAULT_HOLD_MINUTES),
        approvalRequired: payment.approvalRequired !== false,
        enabledModes: Array.isArray(payment.enabledModes)
            ? payment.enabledModes
            : ["full", "deposit_percentage"],
        defaultMode: (payment.defaultMode || "deposit_percentage"),
        depositPercentage: Number(payment.depositPercentage || 50),
        fixedDepositAmount: Number(payment.fixedDepositAmount || 0),
        address: String(value.address || "Tamlois Hair & Trichology Clinic"),
    };
}
async function pricedSelection(serviceId, extraIds, requestedMode) {
    const [serviceDoc, ...extraDocs] = await Promise.all([
        db.doc(`services/${serviceId}`).get(),
        ...extraIds.map((id) => db.doc(`serviceExtras/${id}`).get()),
    ]);
    if (!serviceDoc.exists || serviceDoc.data()?.active === false)
        throw new ApiError(409, "This service is no longer available.");
    const service = serviceDoc.data();
    const extras = extraDocs.map((doc, index) => {
        const value = doc.data();
        if (!doc.exists ||
            value?.active === false ||
            !(value?.compatibleServiceIds || []).includes(serviceId)) {
            throw new ApiError(409, `Extra ${extraIds[index]} is unavailable for this service.`);
        }
        return { id: doc.id, ...value };
    });
    for (const extra of extras) {
        const incompatible = (extra.incompatibleExtraIds || []);
        if (extras.some((candidate) => candidate.id !== extra.id && incompatible.includes(candidate.id))) {
            throw new ApiError(409, "Selected extras are incompatible.");
        }
    }
    const settings = await publicSettings();
    const mode = (typeof requestedMode === "string" ? requestedMode : settings.defaultMode);
    if (mode === "disabled")
        throw new ApiError(409, "Booking is currently unavailable.");
    if (!settings.enabledModes.includes(mode))
        throw new ApiError(409, "That payment option is unavailable.");
    const subtotal = Number(service.price || 0) +
        extras.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
    const duration = Number(service.duration || 0) +
        extras.reduce((sum, extra) => sum + Number(extra.duration || 0), 0);
    const amountDueNow = mode === "full"
        ? subtotal
        : mode === "deposit_percentage"
            ? Math.round(subtotal * settings.depositPercentage) / 100
            : mode === "deposit_fixed"
                ? Math.min(subtotal, settings.fixedDepositAmount)
                : 0;
    return {
        service: { id: serviceDoc.id, ...service },
        extras,
        settings,
        mode,
        subtotal,
        duration,
        amountDueNow,
        balanceDue: subtotal - amountDueNow,
    };
}
async function createHold(body) {
    const draft = (body.draft || {});
    const sessionId = text(draft.sessionId, "Session", 100);
    const serviceId = text(draft.serviceId, "Service", 100);
    const date = text(draft.date, "Date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new ApiError(400, "Date is invalid.");
    const startTime = text(draft.time, "Start time", 5);
    const extraIds = stringArray(draft.extraIds || [], "Extras");
    const selection = await pricedSelection(serviceId, extraIds, draft.paymentMode);
    const isSalon = selection.service.category === "salon";
    const selectedSalonSession = isSalon ? salonSession(startTime) : undefined;
    if (isSalon && !selectedSalonSession)
        throw new ApiError(409, "Choose an available Salon session.");
    validateSchedule(date, startTime, selectedSalonSession
        ? minutes(selectedSalonSession.endTime) -
            minutes(selectedSalonSession.startTime) -
            selection.settings.bufferMinutes
        : selection.duration, selection.settings);
    const holdId = (0, node_crypto_1.randomUUID)();
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + selection.settings.holdMinutes * 60_000);
    const slots = selectedSalonSession
        ? salonCapacityLockIds(date, startTime)
        : lockIds(date, startTime, selection.duration, selection.settings.bookingInterval, selection.settings.bufferMinutes);
    let claimedSlots = slots;
    await db.runTransaction(async (transaction) => {
        const refs = slots.map((id) => db.doc(`bookingHolds/${id}`));
        const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
        const occupied = (snapshot) => snapshot.exists &&
            (snapshot.data()?.status === "booked" ||
                snapshot.data()?.expiresAt?.toMillis() > Date.now());
        const claimedRefs = selectedSalonSession
            ? refs.filter((_ref, index) => !occupied(snapshots[index])).slice(0, 1)
            : snapshots.some(occupied)
                ? []
                : refs;
        if (!claimedRefs.length) {
            throw new ApiError(409, "That time was just reserved by another guest. Choose another slot.");
        }
        claimedSlots = claimedRefs.map((ref) => ref.id);
        claimedRefs.forEach((ref) => transaction.set(ref, {
            type: selectedSalonSession ? "salon-capacity" : "slot",
            holdId,
            sessionId,
            date,
            startTime,
            expiresAt,
            status: "active",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
        transaction.set(db.doc(`bookingHolds/hold--${holdId}`), {
            type: "hold",
            holdId,
            sessionId,
            date,
            startTime,
            endTime: selectedSalonSession?.endTime ||
                clock(minutes(startTime) + selection.duration),
            serviceId,
            category: String(selection.service.category || ""),
            extraIds,
            lockIds: claimedSlots,
            expiresAt,
            status: "active",
            subtotal: selection.subtotal,
            amountDueNow: selection.amountDueNow,
            balanceDue: selection.balanceDue,
            paymentMode: selection.mode,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return {
        id: holdId,
        sessionId,
        date,
        startTime,
        endTime: selectedSalonSession?.endTime ||
            clock(minutes(startTime) + selection.duration),
        serviceId,
        category: String(selection.service.category || ""),
        lockIds: claimedSlots,
        expiresAt: expiresAt.toDate().toISOString(),
        status: "active",
    };
}
async function availableSlots(body) {
    const serviceId = text(body.serviceId, "Service", 100);
    const date = text(body.date, "Date", 10);
    const extraIds = stringArray(body.extraIds || [], "Extras");
    const selection = await pricedSelection(serviceId, extraIds, body.paymentMode);
    if (selection.service.category === "salon") {
        const candidates = SALON_SESSIONS.filter((session) => {
            try {
                validateSchedule(date, session.startTime, minutes(session.endTime) -
                    minutes(session.startTime) -
                    selection.settings.bufferMinutes, selection.settings);
                return true;
            }
            catch {
                return false;
            }
        });
        const sessionLocks = candidates.map((session) => ({
            ...session,
            ids: salonCapacityLockIds(date, session.startTime),
        }));
        const snapshots = await Promise.all(sessionLocks
            .flatMap((session) => session.ids)
            .map((id) => db.doc(`bookingHolds/${id}`).get()));
        const occupiedIds = new Set(snapshots
            .filter((snapshot) => snapshot.exists &&
            (snapshot.data()?.status === "booked" ||
                snapshot.data()?.expiresAt?.toMillis() > Date.now()))
            .map((snapshot) => snapshot.id));
        const sessions = sessionLocks.map((session) => ({
            startTime: session.startTime,
            remaining: session.ids.filter((id) => !occupiedIds.has(id)).length,
        }));
        return {
            date,
            slots: sessions
                .filter((session) => session.remaining > 0)
                .map((session) => session.startTime),
            sessions,
        };
    }
    const candidates = [];
    for (let cursor = selection.settings.openingHour * 60; cursor + selection.duration <= selection.settings.closingHour * 60; cursor += selection.settings.bookingInterval) {
        const startTime = clock(cursor);
        try {
            validateSchedule(date, startTime, selection.duration, selection.settings);
            candidates.push(startTime);
        }
        catch {
            // Invalid candidates are omitted from the public-safe result.
        }
    }
    const candidateLocks = candidates.map((startTime) => ({
        startTime,
        ids: lockIds(date, startTime, selection.duration, selection.settings.bookingInterval, selection.settings.bufferMinutes),
    }));
    const ids = [
        ...new Set(candidateLocks.flatMap((candidate) => candidate.ids)),
    ];
    const snapshots = await Promise.all(ids.map((id) => db.doc(`bookingHolds/${id}`).get()));
    const occupied = new Set(snapshots
        .filter((snapshot) => snapshot.exists &&
        (snapshot.data()?.status === "booked" ||
            snapshot.data()?.expiresAt?.toMillis() > Date.now()))
        .map((snapshot) => snapshot.id));
    return {
        date,
        slots: candidateLocks
            .filter((candidate) => candidate.ids.every((id) => !occupied.has(id)))
            .map((candidate) => candidate.startTime),
    };
}
async function releaseHold(body) {
    const holdId = text(body.holdId, "Hold", 100);
    const sessionId = text(body.sessionId, "Session", 100);
    const holdRef = db.doc(`bookingHolds/hold--${holdId}`);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(holdRef);
        if (!snapshot.exists)
            return;
        const hold = snapshot.data();
        if (hold.sessionId !== sessionId)
            throw new ApiError(403, "This session does not own the hold.");
        if (hold.status !== "active")
            return;
        const lockIdsForHold = (hold.lockIds || []);
        const refs = lockIdsForHold.map((id) => db.doc(`bookingHolds/${id}`));
        const locks = await Promise.all(refs.map((ref) => transaction.get(ref)));
        locks.forEach((lock, index) => {
            if (lock.data()?.holdId === holdId && lock.data()?.status === "active")
                transaction.delete(refs[index]);
        });
        transaction.update(holdRef, {
            status: "released",
            releasedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { released: true };
}
async function paystack(path, init) {
    const response = await fetch(`https://api.paystack.co${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${paystackSecret.value()}`,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
    });
    const payload = (await response.json());
    if (!response.ok || !payload.status || !payload.data)
        throw new ApiError(502, payload.message || "Payment provider unavailable.");
    return payload.data;
}
async function initialisePayment(body) {
    const holdId = text(body.holdId, "Hold", 100);
    const email = text(body.email, "Email", 254).toLowerCase();
    const sessionId = text(body.sessionId, "Session", 100);
    const snapshot = await db.doc(`bookingHolds/hold--${holdId}`).get();
    const hold = snapshot.data();
    if (!hold ||
        hold.status !== "active" ||
        hold.expiresAt.toMillis() <= Date.now())
        throw new ApiError(409, "The appointment hold has expired.");
    if (hold.sessionId !== sessionId)
        throw new ApiError(403, "This session does not own the hold.");
    const selection = await pricedSelection(String(hold.serviceId), (hold.extraIds || []), body.paymentMode);
    if (selection.amountDueNow <= 0)
        throw new ApiError(409, "This booking does not require online payment.");
    if (hold.paymentReference && hold.authorizationUrl) {
        if (hold.paymentMode !== selection.mode)
            throw new ApiError(409, "A payment was already initialized with a different option.");
        return {
            authorizationUrl: String(hold.authorizationUrl),
            reference: String(hold.paymentReference),
        };
    }
    const reference = `TAM-${Date.now()}-${(0, node_crypto_1.randomBytes)(4).toString("hex").toUpperCase()}`;
    const data = await paystack("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
            email,
            amount: Math.round(selection.amountDueNow * 100),
            reference,
            callback_url: `${publicSiteOrigin.value().replace(/\/$/, "")}/#/booking?reference=${encodeURIComponent(reference)}`,
            metadata: { holdId },
        }),
    });
    await snapshot.ref.update({
        paymentReference: reference,
        authorizationUrl: String(data.authorization_url),
        paymentMode: selection.mode,
        subtotal: selection.subtotal,
        amountDueNow: selection.amountDueNow,
        balanceDue: selection.balanceDue,
        email,
        paymentStatus: "initialised",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { authorizationUrl: String(data.authorization_url), reference };
}
async function verifyReference(reference) {
    const data = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    return {
        verified: data.status === "success",
        amount: Number(data.amount || 0) / 100,
        reference: String(data.reference || reference),
        metadata: (data.metadata || {}),
    };
}
async function verifyPayment(body) {
    const reference = text(body.reference, "Payment reference", 150);
    const result = await verifyReference(reference);
    const holdId = typeof result.metadata.holdId === "string" ? result.metadata.holdId : "";
    if (!holdId)
        throw new ApiError(409, "Payment is not linked to a booking hold.");
    const holdRef = db.doc(`bookingHolds/hold--${holdId}`);
    const hold = (await holdRef.get()).data();
    if (!hold)
        throw new ApiError(409, "The linked appointment hold was not found.");
    const verified = result.verified &&
        hold.paymentReference === reference &&
        result.amount === Number(hold.amountDueNow);
    const requiresReconciliation = verified &&
        (hold.status !== "active" || hold.expiresAt.toMillis() <= Date.now());
    await holdRef.update({
        paymentStatus: verified
            ? requiresReconciliation
                ? "paid-reconciliation-required"
                : "paid"
            : "failed",
        paymentVerifiedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    if (requiresReconciliation) {
        await db.doc(`paymentEvents/${reference}`).set({
            type: "paid-after-hold-expiry",
            reference,
            holdId,
            amount: result.amount,
            status: "requires-refund-or-manual-rebooking",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    return {
        verified,
        amount: result.amount,
        reference,
        holdId,
        requiresReconciliation,
    };
}
async function submitBooking(body) {
    const incoming = (body.booking || {});
    const holdId = text(incoming.holdId, "Hold", 100);
    const holdRef = db.doc(`bookingHolds/hold--${holdId}`);
    const holdSnapshot = await holdRef.get();
    const hold = holdSnapshot.data();
    if (hold?.status === "converted" && hold.bookingId) {
        const existing = await db.doc(`bookings/${hold.bookingId}`).get();
        if (existing.exists)
            return existing.data();
    }
    if (!hold ||
        hold.status !== "active" ||
        hold.expiresAt.toMillis() <= Date.now())
        throw new ApiError(409, "The appointment hold has expired.");
    const selection = await pricedSelection(String(hold.serviceId), (hold.extraIds || []), incoming.paymentMode);
    if (hold.paymentReference && selection.mode !== hold.paymentMode)
        throw new ApiError(409, "The payment choice does not match the initialized transaction.");
    const policyConsent = (incoming.policyConsentRecord || {});
    if (policyConsent.accepted !== true ||
        !text(policyConsent.version, "Policy version", 300) ||
        policyConsent.sessionId !== hold.sessionId)
        throw new ApiError(400, "Current booking policies must be accepted.");
    const activePolicies = await db
        .collection("bookingPolicies")
        .where("active", "==", true)
        .get();
    const policySource = activePolicies.docs
        .map((doc) => `${doc.id}@${String(doc.data().version || "")}`)
        .sort((a, b) => a.localeCompare(b))
        .join("|");
    let policyHash = 2166136261;
    for (let index = 0; index < policySource.length; index += 1) {
        policyHash = Math.imul(policyHash ^ policySource.charCodeAt(index), 16777619);
    }
    const currentPolicyVersion = `bundle-${(policyHash >>> 0).toString(36)}`;
    if (!policySource || policyConsent.version !== currentPolicyVersion) {
        throw new ApiError(409, "Booking policies changed. Review and accept the current policy set.");
    }
    const responses = (incoming.intakeResponses || {});
    const paymentReference = optionalText(incoming.paymentReference, 150);
    const requiresPayment = selection.amountDueNow > 0;
    if (requiresPayment) {
        if (!paymentReference || paymentReference !== hold.paymentReference)
            throw new ApiError(409, "A verified payment is required.");
        const verified = await verifyReference(paymentReference);
        if (!verified.verified ||
            verified.amount !== selection.amountDueNow ||
            verified.metadata.holdId !== holdId)
            throw new ApiError(409, "Payment verification failed.");
    }
    const bookingId = (0, node_crypto_1.randomUUID)();
    const reference = `TAM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${(0, node_crypto_1.randomBytes)(3).toString("hex").toUpperCase()}`;
    const managementToken = (0, node_crypto_1.randomBytes)(32).toString("base64url");
    const booking = {
        id: bookingId,
        reference,
        managementToken,
        category: selection.service.category,
        serviceId: selection.service.id,
        serviceName: selection.service.name,
        serviceSnapshot: {
            id: selection.service.id,
            name: selection.service.name,
            category: selection.service.category,
            price: Number(selection.service.price),
            duration: Number(selection.service.duration),
            preparation: String(selection.service.preparation || ""),
        },
        extras: selection.extras.map((extra) => ({
            id: extra.id,
            name: String(extra.name),
            price: Number(extra.price),
            duration: Number(extra.duration),
        })),
        addressSnapshot: selection.settings.address,
        policyVersion: policyConsent.version,
        preparationSnapshot: String(selection.service.preparation || ""),
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        totalDuration: selection.duration,
        subtotal: selection.subtotal,
        amountDueNow: requiresPayment ? selection.amountDueNow : 0,
        balanceDue: requiresPayment ? selection.balanceDue : selection.subtotal,
        fullName: text(incoming.fullName, "Full name", 120),
        phone: text(incoming.phone, "Phone", 40),
        email: text(incoming.email, "Email", 254).toLowerCase(),
        preferredContact: optionalText(incoming.preferredContact, 20),
        concern: optionalText(incoming.concern),
        hopes: optionalText(incoming.hopes),
        concernDuration: optionalText(incoming.concernDuration, 200),
        priorProfessionalTreatment: optionalText(incoming.priorProfessionalTreatment, 500),
        productsTreatments: optionalText(incoming.productsTreatments),
        note: optionalText(incoming.note),
        intakeResponses: responses,
        photoMetadata: incoming.photoMetadata || null,
        policyConsent: true,
        policyConsentRecord: { ...policyConsent, sessionId: hold.sessionId },
        paymentMode: selection.mode,
        paymentStatus: requiresPayment
            ? selection.balanceDue > 0
                ? "partially-paid"
                : "paid"
            : "not-required",
        paymentReference: paymentReference || null,
        status: selection.settings.approvalRequired
            ? "pending-confirmation"
            : "confirmed",
        internalNotes: "",
        createdAt: new Date().toISOString(),
        followUpDue: false,
        holdId,
        lockIds: hold.lockIds,
    };
    await db.runTransaction(async (transaction) => {
        const freshHold = await transaction.get(holdRef);
        if (freshHold.data()?.status !== "active")
            throw new ApiError(409, "This hold has already been used.");
        transaction.create(db.doc(`bookings/${bookingId}`), booking);
        transaction.update(holdRef, {
            status: "converted",
            bookingId,
            convertedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        for (const id of (hold.lockIds || []))
            transaction.update(db.doc(`bookingHolds/${id}`), {
                status: "booked",
                bookingId,
                expiresAt: null,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
    });
    return booking;
}
async function verifyRequestAttestation(req) {
    if (!requireAppCheck.value())
        return;
    const token = req.header("X-Firebase-AppCheck");
    if (!token)
        throw new ApiError(401, "App Check attestation is required.");
    try {
        await (0, app_check_1.getAppCheck)().verifyToken(token);
    }
    catch {
        throw new ApiError(401, "App Check attestation is invalid.");
    }
}
async function enforceRateLimit(req) {
    const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || req.ip || "unknown";
    const key = (0, node_crypto_1.createHash)("sha256").update(address).digest("hex");
    const ref = db.doc(`bookingRateLimits/${key}`);
    const windowMs = 60_000;
    const maximum = 60;
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const value = snapshot.data();
        const windowStartedAt = value?.windowStartedAt?.toMillis?.() || 0;
        if (!value || Date.now() - windowStartedAt >= windowMs) {
            transaction.set(ref, {
                count: 1,
                windowStartedAt: firestore_1.Timestamp.now(),
                expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 2 * windowMs),
            });
            return;
        }
        if (Number(value.count || 0) >= maximum)
            throw new ApiError(429, "Too many booking requests. Try again shortly.");
        transaction.update(ref, { count: firestore_1.FieldValue.increment(1) });
    });
}
exports.bookingApi = (0, https_1.onRequest)({ region: "europe-west1", secrets: [paystackSecret], timeoutSeconds: 30 }, async (req, res) => {
    applyCors(req, res);
    if (req.method === "OPTIONS")
        return void res.status(204).send("");
    if (req.method !== "POST")
        return void json(res, 405, { message: "Method not allowed." });
    try {
        await verifyRequestAttestation(req);
        await enforceRateLimit(req);
        const body = (req.body || {});
        const path = req.path.replace(/\/$/, "");
        const result = path === "/availability"
            ? await availableSlots(body)
            : path === "/holds"
                ? await createHold(body)
                : path === "/holds/release"
                    ? await releaseHold(body)
                    : path === "/payments/initialise"
                        ? await initialisePayment(body)
                        : path === "/payments/verify"
                            ? await verifyPayment(body)
                            : path === "/bookings"
                                ? await submitBooking(body)
                                : (() => {
                                    throw new ApiError(404, "Endpoint not found.");
                                })();
        json(res, 200, result);
    }
    catch (error) {
        const status = error instanceof ApiError ? error.status : 500;
        json(res, status, {
            message: error instanceof Error ? error.message : "Booking service failed.",
        });
    }
});
exports.paystackWebhook = (0, https_1.onRequest)({ region: "europe-west1", secrets: [paystackSecret] }, async (req, res) => {
    const signature = String(req.headers["x-paystack-signature"] || "");
    const digest = (0, node_crypto_1.createHmac)("sha512", paystackSecret.value())
        .update(req.rawBody)
        .digest("hex");
    const valid = signature.length === digest.length &&
        (0, node_crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(digest));
    if (!valid)
        return void res.status(401).send("Invalid signature");
    const event = req.body;
    if (event.event === "charge.success" && event.data?.metadata?.holdId) {
        const holdId = event.data.metadata.holdId;
        const reference = String(event.data.reference || "");
        const holdRef = db.doc(`bookingHolds/hold--${holdId}`);
        const hold = (await holdRef.get()).data();
        const requiresReconciliation = Boolean(hold &&
            (hold.status !== "active" ||
                hold.expiresAt?.toMillis?.() <= Date.now()));
        if (hold)
            await holdRef.update({
                paymentReference: event.data.reference,
                paidAmount: Number(event.data.amount || 0) / 100,
                paymentStatus: requiresReconciliation
                    ? "paid-reconciliation-required"
                    : "paid",
                paymentVerifiedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        await db.doc(`paymentEvents/${reference}`).set({
            type: "charge.success",
            reference,
            holdId,
            amount: Number(event.data.amount || 0) / 100,
            status: !hold
                ? "unknown-hold-investigation"
                : requiresReconciliation
                    ? "requires-refund-or-manual-rebooking"
                    : "verified",
            receivedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    res.status(200).send("ok");
});
