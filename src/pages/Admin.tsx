import { useEffect, useState } from "react";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import { format } from "date-fns";
import { Brand } from "../components/Layout";
import { SEO } from "../components/SEO";
import { currency } from "../lib/booking";
import { defaultSettings } from "../lib/availability";
import { auth, db, firebaseEnabled } from "../lib/firebase";
import { appRepositories } from "../repositories/app";
import { bookingConfigurationRepositories } from "../repositories/bookingConfigurationRepository";
import { availabilityRepository } from "../repositories/availabilityRepository";
import { contentRepository } from "../repositories/contentRepository";
import {
  galleryRepository,
  homeOfferingRepository,
} from "../repositories/homeContentRepository";
import { updateBookingWithLockCleanup } from "../repositories/firestoreRepository";
import { shopifyEnabled } from "../lib/adapters";
import { homeOfferings as defaultHomeOfferings } from "../data/content";
import type {
  BlockedPeriod,
  Booking,
  BookingPolicy,
  BookingStatus,
  BusinessSettings,
  IntakeQuestion,
  GalleryItem,
  HomeOffering,
  Service,
  ServiceExtra,
} from "../types";

const adminLinks = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/services", "Services", Package],
  ["/admin/bookings", "Bookings", Users],
  ["/admin/availability", "Availability", CalendarClock],
  ["/admin/content", "Content", FileText],
  ["/admin/settings", "Settings", Settings],
] as const;

const { bookings: bookingRepository, services: serviceRepository } =
  appRepositories;
const isDemoAdmin = () => sessionStorage.getItem("tamlois-admin") === "true";

export function AdminLoginPage() {
  const [email, setEmail] = useState(
    firebaseEnabled ? "" : "owner@tamlois.demo",
  );
  const [password, setPassword] = useState(firebaseEnabled ? "" : "demo1234");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (
      !firebaseEnabled &&
      email === "owner@tamlois.demo" &&
      password === "demo1234"
    ) {
      sessionStorage.setItem("tamlois-admin", "true");
      navigate("/admin");
      return;
    }
    if (firebaseEnabled && auth) {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const token = await getIdTokenResult(credential.user, true);
        if (token.claims.admin !== true) {
          await signOut(auth);
          setError("This account is not authorised as a clinic administrator.");
          return;
        }
        navigate("/admin");
      } catch {
        setError(
          "Sign-in failed. Check the account, password and admin claim.",
        );
      }
      return;
    }
    setError("Use the demo credentials shown below.");
  }
  return (
    <>
      <SEO title="Admin login" description="Secure owner access for Tamlois." />
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--forest-50)] p-4">
        <div className="w-full max-w-md rounded-[14px] bg-white p-7 shadow-[0_24px_70px_rgba(13,45,33,.12)]">
          <Brand />
          <h1 className="mt-9 font-display text-4xl text-[var(--forest-950)]">
            Clinic admin
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {firebaseEnabled
              ? "Sign in with the authorised Firebase account."
              : "Demo mode stores changes in this browser only."}
          </p>
          <form onSubmit={submit} className="mt-7 grid gap-5">
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary">Sign in</button>
          </form>
          {!firebaseEnabled && (
            <div className="mt-6 rounded-[12px] bg-[var(--forest-50)] p-4 text-xs leading-5">
              <strong>Demo login</strong>
              <br />
              owner@tamlois.demo
              <br />
              demo1234
            </div>
          )}
          <Link
            to="/"
            className="mt-6 inline-flex text-sm font-bold text-[var(--forest-800)]"
          >
            Return to public website
          </Link>
        </div>
      </main>
    </>
  );
}

export function ProtectedAdmin() {
  const [state, setState] = useState<"loading" | "allowed" | "denied">(() =>
    firebaseEnabled ? "loading" : isDemoAdmin() ? "allowed" : "denied",
  );
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState("denied");
        return;
      }
      const token = await getIdTokenResult(user);
      setState(token.claims.admin === true ? "allowed" : "denied");
    });
  }, []);
  if (state === "loading")
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--forest-50)]">
        <p role="status">Checking administrator access...</p>
      </main>
    );
  return state === "allowed" ? (
    <AdminLayout />
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

function AdminLayout() {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-[#f3f5f2] lg:grid lg:grid-cols-[250px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[var(--line)] bg-white p-5 transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Brand compact />
          <button
            className="grid size-11 place-items-center lg:hidden"
            onClick={() => setMenu(false)}
            aria-label="Close admin navigation"
          >
            <X />
          </button>
        </div>
        <div className="mt-7">
          <span className="status placeholder-badge">
            {firebaseEnabled ? "Firebase" : "Demo data"}
          </span>
        </div>
        <nav className="mt-6 grid gap-1" aria-label="Admin navigation">
          {adminLinks.map(([to, label, Icon]) => (
            <NavLink
              end={to === "/admin"}
              key={to}
              to={to}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold ${isActive ? "bg-[var(--forest-800)] text-white" : "text-[var(--muted)] hover:bg-[var(--forest-50)] hover:text-[var(--forest-950)]"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          className="mt-8 flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-[var(--muted)]"
          onClick={async () => {
            sessionStorage.removeItem("tamlois-admin");
            if (firebaseEnabled && auth) await signOut(auth);
            navigate("/admin/login");
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
      <div>
        <header className="flex h-[68px] items-center justify-between border-b border-[var(--line)] bg-white px-4 md:px-7">
          <button
            className="grid size-11 place-items-center lg:hidden"
            onClick={() => setMenu(true)}
            aria-label="Open admin navigation"
          >
            <Menu />
          </button>
          <p className="text-sm font-bold text-[var(--forest-950)]">
            Tamlois clinic operations
          </p>
          <Link to="/" className="text-sm font-bold text-[var(--forest-800)]">
            View site
          </Link>
        </header>
        <main className="p-4 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminHeading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-4xl text-[var(--forest-950)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{text}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    Promise.all([bookingRepository.list(), serviceRepository.list()]).then(
      ([b, s]) => {
        setBookings(b);
        setServices(s);
      },
    );
  }, []);
  const today = format(new Date(), "yyyy-MM-dd");
  const stats = [
    ["Today", bookings.filter((b) => b.date === today).length, CalendarClock],
    [
      "Upcoming",
      bookings.filter(
        (b) => b.date >= today && !["cancelled", "expired"].includes(b.status),
      ).length,
      Users,
    ],
    [
      "Pending",
      bookings.filter((b) =>
        [
          "request-submitted",
          "pending-confirmation",
          "pending-payment",
        ].includes(b.status),
      ).length,
      CircleDollarSign,
    ],
    ["Active services", services.filter((s) => s.active).length, Package],
  ] as const;
  return (
    <>
      <AdminHeading
        title="Clinic overview"
        text="Bookings, services and follow-up at a glance."
        action={
          <Link to="/admin/services/new" className="btn btn-primary">
            <Plus size={17} />
            New service
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="surface p-5">
            <Icon size={20} className="text-[var(--forest-700)]" />
            <p className="mt-5 text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[1.3fr_.7fr]">
        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <h2 className="font-bold">Upcoming bookings</h2>
            <Link
              to="/admin/bookings"
              className="text-sm font-bold text-[var(--forest-800)]"
            >
              View all
            </Link>
          </div>
          {bookings.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[var(--forest-50)] text-xs text-[var(--muted)]">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 6).map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-t border-[var(--line)]"
                    >
                      <td className="p-4 font-bold">{booking.reference}</td>
                      <td className="p-4">{booking.fullName}</td>
                      <td className="p-4">{booking.serviceName}</td>
                      <td className="p-4">
                        {booking.date} {booking.startTime}
                      </td>
                      <td className="p-4">
                        <span className="status capitalize">
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
              No demo bookings yet. Complete the public booking flow to add one.
            </p>
          )}
        </section>
        <section className="surface p-5">
          <h2 className="font-bold">Booking funnel</h2>
          <div className="mt-5 grid gap-4 text-sm">
            {[
              ["Started", 0],
              ["Submitted", bookings.length],
              [
                "Confirmed",
                bookings.filter((b) => b.status === "confirmed").length,
              ],
              [
                "Completed",
                bookings.filter((b) => b.status === "completed").length,
              ],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex items-center justify-between border-b border-[var(--line)] pb-3"
              >
                <span className="text-[var(--muted)]">{label}</span>
                <strong className="tabular-nums">{value}</strong>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Started events require an analytics provider. Submitted values use
            local demo records.
          </p>
        </section>
      </div>
    </>
  );
}

export function AdminServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const load = () =>
    serviceRepository
      .list()
      .then((result) => setItems(result.sort((a, b) => a.order - b.order)));
  useEffect(() => {
    void load();
  }, []);
  async function toggle(item: Service) {
    await serviceRepository.save({ ...item, active: !item.active });
    load();
  }
  return (
    <>
      <AdminHeading
        title="Services"
        text="Edit public catalogue content, order and visibility."
        action={
          <Link to="/admin/services/new" className="btn btn-primary">
            <Plus size={17} />
            New service
          </Link>
        }
      />
      <div className="surface overflow-hidden">
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              className="control pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[var(--forest-50)] text-xs text-[var(--muted)]">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Service</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((item) =>
                  item.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)]">
                    <td className="p-4 tabular-nums">{item.order}</td>
                    <td className="p-4">
                      <strong>{item.name}</strong>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 capitalize">{item.type}</td>
                    <td className="p-4">{currency(item.price)}</td>
                    <td className="p-4">{item.duration} min</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggle(item)}
                        className={`status ${item.active ? "" : "placeholder-badge"}`}
                      >
                        {item.active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="p-4">
                      <Link
                        to={`/admin/services/${item.id}`}
                        className="grid size-10 place-items-center rounded-full hover:bg-[var(--forest-50)]"
                        aria-label={`Edit ${item.name}`}
                      >
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <BookingConfiguration />
    </>
  );
}

function BookingConfiguration() {
  const [extras, setExtras] = useState<ServiceExtra[]>([]);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const load = () =>
    Promise.all([
      bookingConfigurationRepositories.extras.list(),
      bookingConfigurationRepositories.questions.list(),
    ]).then(([nextExtras, nextQuestions]) => {
      setExtras(nextExtras.sort((a, b) => a.order - b.order));
      setQuestions(nextQuestions.sort((a, b) => a.order - b.order));
    });
  useEffect(() => {
    void load();
  }, []);
  const saveExtra = async (extra: ServiceExtra) => {
    await bookingConfigurationRepositories.extras.save(extra);
    await load();
  };
  const saveQuestion = async (question: IntakeQuestion) => {
    await bookingConfigurationRepositories.questions.save(question);
    await load();
  };
  return (
    <div className="mt-7 grid gap-7 xl:grid-cols-2">
      <section className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--forest-950)]">
              Compatible extras
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Price, duration, order, status and service compatibility.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              saveExtra({
                id: crypto.randomUUID(),
                name: "New extra",
                description: "Describe this optional extra.",
                price: 0,
                duration: 15,
                compatibleServiceIds: [],
                incompatibleExtraIds: [],
                active: false,
                order: extras.length + 1,
                placeholder: true,
              })
            }
          >
            <Plus size={16} />
            Add extra
          </button>
        </div>
        <div className="rule-list mt-5">
          {extras.map((extra) => (
            <div className="py-4" key={extra.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="text-sm">{extra.name}</strong>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {currency(extra.price)} · {extra.duration} min ·{" "}
                    {extra.compatibleServiceIds.length} services
                  </p>
                </div>
                <button
                  type="button"
                  className={`status ${extra.active ? "" : "placeholder-badge"}`}
                  onClick={() => saveExtra({ ...extra, active: !extra.active })}
                >
                  {extra.active ? "Active" : "Hidden"}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  aria-label={`${extra.name} price`}
                  className="control"
                  type="number"
                  value={extra.price}
                  onChange={(e) =>
                    setExtras((items) =>
                      items.map((item) =>
                        item.id === extra.id
                          ? { ...item, price: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`${extra.name} duration`}
                  className="control"
                  type="number"
                  value={extra.duration}
                  onChange={(e) =>
                    setExtras((items) =>
                      items.map((item) =>
                        item.id === extra.id
                          ? { ...item, duration: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`${extra.name} order`}
                  className="control"
                  type="number"
                  value={extra.order}
                  onChange={(e) =>
                    setExtras((items) =>
                      items.map((item) =>
                        item.id === extra.id
                          ? { ...item, order: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => saveExtra(extra)}
                >
                  Save
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                <input
                  aria-label={`${extra.name} compatible services`}
                  className="control"
                  value={extra.compatibleServiceIds.join(", ")}
                  onChange={(e) =>
                    setExtras((items) =>
                      items.map((item) =>
                        item.id === extra.id
                          ? {
                              ...item,
                              compatibleServiceIds: e.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="Compatible service IDs, comma separated"
                />
                <input
                  aria-label={`${extra.name} incompatible extras`}
                  className="control"
                  value={extra.incompatibleExtraIds.join(", ")}
                  onChange={(e) =>
                    setExtras((items) =>
                      items.map((item) =>
                        item.id === extra.id
                          ? {
                              ...item,
                              incompatibleExtraIds: e.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="Incompatible extra IDs, comma separated"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[var(--forest-950)]">
              Intake schemas
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Typed, ordered questions scoped to salon or trichology.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              saveQuestion({
                id: crypto.randomUUID(),
                schemaId: "intake-trichology",
                label: "New intake question",
                type: "short-text",
                required: false,
                order: questions.length + 1,
                active: false,
              })
            }
          >
            <Plus size={16} />
            Add question
          </button>
        </div>
        <div className="rule-list mt-5">
          {questions.map((question) => (
            <div className="py-4" key={question.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <strong className="text-sm">{question.label}</strong>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {question.schemaId} · {question.type} ·{" "}
                    {question.required ? "Required" : "Optional"}
                  </p>
                </div>
                <button
                  type="button"
                  className={`status ${question.active ? "" : "placeholder-badge"}`}
                  onClick={() =>
                    saveQuestion({ ...question, active: !question.active })
                  }
                >
                  {question.active ? "Active" : "Hidden"}
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_90px_auto]">
                <input
                  className="control"
                  aria-label={`${question.label} label`}
                  value={question.label}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? { ...item, label: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <select
                  className="control"
                  aria-label={`${question.label} type`}
                  value={question.type}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              type: e.target.value as IntakeQuestion["type"],
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {[
                    "short-text",
                    "long-text",
                    "single-choice",
                    "multi-choice",
                    "yes-no",
                    "checkbox",
                    "date",
                  ].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <input
                  className="control"
                  aria-label={`${question.label} order`}
                  type="number"
                  value={question.order}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? { ...item, order: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => saveQuestion(question)}
                >
                  Save
                </button>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? { ...item, required: e.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Required answer
              </label>
              <div className="mt-2 grid gap-2">
                <input
                  className="control"
                  aria-label={`${question.label} help text`}
                  value={question.helpText || ""}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? { ...item, helpText: e.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Optional help text"
                />
                <input
                  className="control"
                  aria-label={`${question.label} options`}
                  value={(question.options || []).join(", ")}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              options: e.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="Choice options, comma separated"
                />
                <input
                  className="control"
                  aria-label={`${question.label} condition`}
                  value={
                    question.condition
                      ? `${question.condition.questionId}=${question.condition.equals}`
                      : ""
                  }
                  onChange={(e) => {
                    const [questionId, ...rest] = e.target.value.split("=");
                    const equals = rest.join("=");
                    setQuestions((items) =>
                      items.map((item) =>
                        item.id === question.id
                          ? {
                              ...item,
                              condition:
                                questionId && equals
                                  ? { questionId, equals }
                                  : undefined,
                            }
                          : item,
                      ),
                    );
                  }}
                  placeholder="Conditional display: question-id=Answer"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminServiceEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [item, setItem] = useState<Service | null>(null);
  const [publishError, setPublishError] = useState("");
  useEffect(() => {
    if (isNew)
      setItem({
        id: crypto.randomUUID(),
        slug: "",
        name: "",
        category: "trichology",
        type: "service",
        summary: "",
        description: "",
        concerns: [],
        price: 0,
        duration: 60,
        preparation: "",
        expectation: "",
        aftercare: "",
        caution: "",
        consultationRequired: false,
        depositRequired: false,
        depositAmount: 0,
        active: true,
        order: 1,
        image: "",
        imageAlt: "",
        variations: [],
        placeholder: true,
      });
    else serviceRepository.get(id).then(setItem);
  }, [id, isNew]);
  if (!item) return <p>Loading service...</p>;
  const set = <K extends keyof Service>(key: K, value: Service[K]) =>
    setItem((current) => (current ? { ...current, [key]: value } : current));
  const updateVariation = (
    index: number,
    key: "name" | "price" | "duration",
    value: string | number,
  ) =>
    set(
      "variations",
      item.variations.map((variation, position) =>
        position === index ? { ...variation, [key]: value } : variation,
      ),
    );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!item) return;
    setPublishError("");
    if (
      item.active &&
      (!item.summary.trim() || !item.image.trim() || !item.imageAlt.trim())
    ) {
      setPublishError(
        "Active services require a summary, image URL and meaningful image alt text. Hide the service to save an incomplete draft.",
      );
      return;
    }
    const current = item;
    const slug =
      current.slug ||
      current.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    await serviceRepository.save({ ...current, slug });
    navigate("/admin/services");
  }
  async function remove() {
    if (!item || !confirm("Archive this demo service?")) return;
    const current = item;
    await serviceRepository.save({ ...current, active: false });
    navigate("/admin/services");
  }
  return (
    <>
      <AdminHeading
        title={isNew ? "New service" : "Edit service"}
        text="Public fields are marked as placeholder until confirmed."
      />
      <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="surface grid gap-5 p-5 md:grid-cols-2">
          <div className="field">
            <label>Name</label>
            <input
              aria-label="Name"
              required
              value={item.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label>URL slug</label>
            <input
              aria-label="URL slug"
              value={item.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="Generated from name when blank"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select
              aria-label="Category"
              value={item.category}
              onChange={(e) =>
                set("category", e.target.value as Service["category"])
              }
            >
              <option value="salon">Salon</option>
              <option value="trichology">Trichology</option>
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select
              aria-label="Type"
              value={item.type}
              onChange={(e) => set("type", e.target.value as Service["type"])}
            >
              <option value="service">Service</option>
              <option value="consultation">Consultation</option>
              <option value="package">Package</option>
            </select>
          </div>
          <div className="field md:col-span-2">
            <label>Short summary</label>
            <textarea
              aria-label="Short summary"
              value={item.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Full description</label>
            <textarea
              aria-label="Full description"
              value={item.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Suitable concerns (comma separated)</label>
            <input
              aria-label="Suitable concerns"
              value={item.concerns.join(", ")}
              onChange={(e) =>
                set(
                  "concerns",
                  e.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <div className="field">
            <label>Price (NGN)</label>
            <input
              aria-label="Price (NGN)"
              type="number"
              min="0"
              value={item.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Duration (minutes)</label>
            <input
              aria-label="Duration (minutes)"
              type="number"
              min="15"
              step="15"
              value={item.duration}
              onChange={(e) => set("duration", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Deposit amount</label>
            <input
              aria-label="Deposit amount"
              type="number"
              min="0"
              value={item.depositAmount}
              onChange={(e) => set("depositAmount", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Display order</label>
            <input
              aria-label="Display order"
              type="number"
              value={item.order}
              onChange={(e) => set("order", Number(e.target.value))}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Image URL</label>
            <input
              aria-label="Image URL"
              type="url"
              value={item.image}
              onChange={(e) => set("image", e.target.value)}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Image alt text</label>
            <input
              aria-label="Image alt text"
              value={item.imageAlt}
              onChange={(e) => set("imageAlt", e.target.value)}
            />
          </div>
          {[
            ["preparation", "Preparation"],
            ["expectation", "What to expect"],
            ["aftercare", "Aftercare"],
            ["caution", "Caution note"],
          ].map(([key, label]) => (
            <div className="field md:col-span-2" key={key}>
              <label>{label}</label>
              <textarea
                aria-label={label}
                value={item[key as keyof Service] as string}
                onChange={(e) =>
                  set(key as keyof Service, e.target.value as never)
                }
              />
            </div>
          ))}
          <section className="md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Variations or sub-services</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  set("variations", [
                    ...item.variations,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      price: item.price,
                      duration: item.duration,
                    },
                  ])
                }
              >
                Add variation
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {item.variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className="grid gap-3 rounded-[12px] border border-[var(--line)] p-4 sm:grid-cols-[1fr_140px_140px_auto]"
                >
                  <input
                    aria-label={`Variation ${index + 1} name`}
                    value={variation.name}
                    onChange={(e) =>
                      updateVariation(index, "name", e.target.value)
                    }
                    placeholder="Variation name"
                    className="control"
                  />
                  <input
                    aria-label={`Variation ${index + 1} price`}
                    type="number"
                    value={variation.price}
                    onChange={(e) =>
                      updateVariation(index, "price", Number(e.target.value))
                    }
                    className="control"
                  />
                  <input
                    aria-label={`Variation ${index + 1} duration`}
                    type="number"
                    value={variation.duration}
                    onChange={(e) =>
                      updateVariation(index, "duration", Number(e.target.value))
                    }
                    className="control"
                  />
                  <button
                    type="button"
                    className="text-sm font-bold text-[#8f302f]"
                    onClick={() =>
                      set(
                        "variations",
                        item.variations.filter(
                          (_, position) => position !== index,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="surface h-fit p-5">
          <h2 className="font-bold">Publishing</h2>
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={item.active}
              onChange={(e) => set("active", e.target.checked)}
              className="size-5 accent-[var(--forest-800)]"
            />
            Visible on the public site
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={Boolean(item.featured)}
              onChange={(e) => set("featured", e.target.checked)}
              className="size-5 accent-[var(--forest-800)]"
            />
            Featured within category
          </label>
          <div className="field mt-4">
            <label>Intake schema</label>
            <select
              value={item.intakeSchemaId || ""}
              onChange={(e) =>
                set("intakeSchemaId", e.target.value || undefined)
              }
            >
              <option value="">No service-specific intake</option>
              <option value="intake-salon">Salon intake</option>
              <option value="intake-trichology">Trichology intake</option>
            </select>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={Boolean(item.photoUploadEnabled)}
              onChange={(e) => set("photoUploadEnabled", e.target.checked)}
              className="size-5 accent-[var(--forest-800)]"
            />
            Allow optional preparation photo
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={item.consultationRequired}
              onChange={(e) => set("consultationRequired", e.target.checked)}
              className="size-5 accent-[var(--forest-800)]"
            />
            Consultation required
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={item.depositRequired}
              onChange={(e) => set("depositRequired", e.target.checked)}
              className="size-5 accent-[var(--forest-800)]"
            />
            Deposit required
          </label>
          {publishError && (
            <p className="mt-5 field-error" role="alert">
              {publishError}
            </p>
          )}
          <div className="mt-6 grid gap-3">
            <button className="btn btn-primary">Save service</button>
            {!isNew && (
              <Link to={`/services/${item.slug}`} className="btn btn-secondary">
                Preview public page
              </Link>
            )}
            {!isNew && (
              <button
                type="button"
                className="btn text-[#8f302f]"
                onClick={remove}
              >
                Archive service
              </button>
            )}
          </div>
        </aside>
      </form>
    </>
  );
}

export function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [payment, setPayment] = useState("all");
  const [date, setDate] = useState("");
  const load = () => bookingRepository.list().then(setItems);
  useEffect(() => {
    void load();
  }, []);
  async function update(item: Booking, next: BookingStatus) {
    if (firebaseEnabled && db)
      await updateBookingWithLockCleanup(db, item, next);
    else
      await bookingRepository.save({
        ...item,
        status: next,
        followUpDue: next === "completed",
      });
    load();
  }
  function exportCsv() {
    const header = "reference,name,email,phone,service,date,time,status\n";
    const rows = items
      .map((b) =>
        [
          b.reference,
          b.fullName,
          b.email,
          b.phone,
          b.serviceName,
          b.date,
          b.startTime,
          b.status,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([header + rows], { type: "text/csv" }),
    );
    link.download = "tamlois-bookings.csv";
    link.click();
  }
  const filtered = items.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      (category === "all" || item.category === category) &&
      (payment === "all" || item.paymentStatus === payment) &&
      (!date || item.date === date) &&
      `${item.fullName} ${item.reference} ${item.email} ${item.phone} ${item.serviceName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <AdminHeading
        title="Bookings"
        text="Search, filter and update appointment requests."
        action={
          <button className="btn btn-secondary" onClick={exportCsv}>
            Export CSV
          </button>
        }
      />
      <div className="surface p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_190px_170px_190px_180px]">
          <input
            className="control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, name, email, phone or service"
          />
          <select
            className="control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {[
              "draft",
              "slot-held",
              "pending-payment",
              "request-submitted",
              "pending-confirmation",
              "confirmed",
              "completed",
              "cancelled",
              "no-show",
              "expired",
              "reschedule-requested",
              "cancellation-requested",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className="control"
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            <option value="salon">Salon</option>
            <option value="trichology">Trichology</option>
          </select>
          <select
            className="control"
            aria-label="Filter payment"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="all">All payments</option>
            {[
              "not-required",
              "not-started",
              "initialised",
              "processing",
              "partially-paid",
              "paid",
              "failed",
              "cancelled",
              "refunded",
              "partially-refunded",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <input
            className="control"
            aria-label="Filter date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-5 grid gap-4">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="surface grid gap-4 p-5 xl:grid-cols-[1fr_1fr_auto] xl:items-center"
          >
            <div>
              <p className="font-bold">{item.fullName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {item.reference} · {item.phone}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">{item.serviceName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {item.date} at {item.startTime} · Payment: {item.paymentStatus}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="status capitalize">{item.status}</span>
              {["request-submitted", "pending-confirmation"].includes(
                item.status,
              ) && (
                <button
                  className="btn btn-secondary min-h-9 py-2"
                  onClick={() => update(item, "confirmed")}
                >
                  Confirm
                </button>
              )}
              {item.status === "confirmed" && (
                <>
                  <button
                    className="btn btn-secondary min-h-9 py-2"
                    onClick={() => update(item, "completed")}
                  >
                    Complete
                  </button>
                  <button
                    className="btn btn-quiet min-h-9 py-2"
                    onClick={() => update(item, "no-show")}
                  >
                    No-show
                  </button>
                </>
              )}{" "}
              {!["completed", "cancelled", "no-show", "expired"].includes(
                item.status,
              ) && (
                <button
                  className="btn btn-quiet min-h-9 py-2 text-[#8f302f]"
                  onClick={() => update(item, "cancelled")}
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="field xl:col-span-3">
              <label htmlFor={`note-${item.id}`}>Internal notes</label>
              <div className="flex gap-2">
                <input
                  id={`note-${item.id}`}
                  value={item.internalNotes}
                  onChange={(e) =>
                    setItems((current) =>
                      current.map((booking) =>
                        booking.id === item.id
                          ? { ...booking, internalNotes: e.target.value }
                          : booking,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    await bookingRepository.save(item);
                    await load();
                  }}
                >
                  Save note
                </button>
              </div>
            </div>
            {item.followUpDue && (
              <p className="text-xs font-bold text-[#8b4e22] xl:col-span-3">
                Follow-up or rebooking is due.
              </p>
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="surface p-10 text-center text-sm text-[var(--muted)]">
            No bookings match these filters.
          </div>
        )}
      </div>
    </>
  );
}

export function AdminAvailabilityPage() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [blocks, setBlocks] = useState<BlockedPeriod[]>([]);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    availabilityRepository
      .getAdmin()
      .then(({ settings: next, blocks: nextBlocks }) => {
        setSettings(next);
        setBlocks(nextBlocks);
      });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (Boolean(start) !== Boolean(end)) {
      window.alert(
        "Enter both a start and end time, or leave both blank for a full-day block.",
      );
      return;
    }
    if (start && end && start >= end) {
      window.alert("The block end time must be later than its start time.");
      return;
    }
    const block = {
      id: crypto.randomUUID(),
      date,
      start: start || undefined,
      end: end || undefined,
      reason,
    };
    const next = await availabilityRepository.addBlock(block, {
      ...settings,
      blockedPeriods: blocks,
    });
    setBlocks(next);
    setSettings((current) => ({ ...current, blockedPeriods: next }));
    setDate("");
    setStart("");
    setEnd("");
    setReason("");
  }
  async function remove(id: string) {
    const next = await availabilityRepository.removeBlock(id, {
      ...settings,
      blockedPeriods: blocks,
    });
    setBlocks(next);
    setSettings((current) => ({ ...current, blockedPeriods: next }));
  }
  const setRule = <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));
  async function saveRules() {
    if (
      settings.openingHour < 0 ||
      settings.closingHour > 24 ||
      settings.openingHour >= settings.closingHour
    ) {
      window.alert("Opening time must be earlier than closing time.");
      return;
    }
    if (
      settings.bookingInterval < 15 ||
      settings.bookingInterval > 120 ||
      settings.bufferMinutes < 0 ||
      settings.bufferMinutes > 180 ||
      settings.minimumNoticeHours < 0 ||
      settings.maximumAdvanceDays < 1
    ) {
      window.alert(
        "Review the booking interval, buffer, notice and advance-window ranges.",
      );
      return;
    }
    await availabilityRepository.saveSettings({
      ...settings,
      blockedPeriods: blocks,
    });
    setSaved(true);
  }
  return (
    <>
      <AdminHeading
        title="Availability"
        text="Configure hours and block full or partial days."
      />
      <div className="grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
        <form onSubmit={save} className="surface h-fit p-5">
          <h2 className="font-bold">Add a block</h2>
          <div className="mt-5 grid gap-4">
            <div className="field">
              <label>Date</label>
              <input
                aria-label="Date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label>Start (optional)</label>
                <input
                  aria-label="Start (optional)"
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="field">
                <label>End (optional)</label>
                <input
                  aria-label="End (optional)"
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Internal reason</label>
              <input
                aria-label="Internal reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button className="btn btn-primary">Block time</button>
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Leave both times empty to block the full day. Reasons remain
            admin-only.
          </p>
        </form>
        <section className="surface p-5">
          <h2 className="font-bold">Current blocks</h2>
          <div className="mt-4 rule-list">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="text-sm font-bold">
                    {block.date}{" "}
                    {block.start ? `${block.start}-${block.end}` : "Full day"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {block.reason}
                  </p>
                </div>
                <button
                  className="text-sm font-bold text-[#8f302f]"
                  onClick={() => remove(block.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                No dates are blocked.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="surface mt-7 p-5">
        <h2 className="font-bold">Booking rules</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="field">
            <label htmlFor="opening-hour">Opening hour</label>
            <input
              id="opening-hour"
              type="number"
              min="0"
              max="23"
              value={settings.openingHour}
              onChange={(e) => setRule("openingHour", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="closing-hour">Closing hour</label>
            <input
              id="closing-hour"
              type="number"
              min="1"
              max="24"
              value={settings.closingHour}
              onChange={(e) => setRule("closingHour", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="interval">Interval (minutes)</label>
            <input
              id="interval"
              type="number"
              min="15"
              step="15"
              value={settings.bookingInterval}
              onChange={(e) =>
                setRule("bookingInterval", Number(e.target.value))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="notice">Minimum notice (hours)</label>
            <input
              id="notice"
              type="number"
              min="0"
              value={settings.minimumNoticeHours}
              onChange={(e) =>
                setRule("minimumNoticeHours", Number(e.target.value))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="advance">Advance window (days)</label>
            <input
              id="advance"
              type="number"
              min="1"
              value={settings.maximumAdvanceDays}
              onChange={(e) =>
                setRule("maximumAdvanceDays", Number(e.target.value))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="buffer">Buffer (minutes)</label>
            <input
              id="buffer"
              type="number"
              min="0"
              step="5"
              value={settings.bufferMinutes}
              onChange={(e) => setRule("bufferMinutes", Number(e.target.value))}
            />
          </div>
        </div>
        <fieldset className="mt-6">
          <legend className="text-sm font-bold">Closed days</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((label, day) => (
              <label
                key={label}
                className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm"
              >
                <input
                  type="checkbox"
                  checked={settings.closedDays.includes(day)}
                  onChange={(e) =>
                    setRule(
                      "closedDays",
                      e.target.checked
                        ? [...settings.closedDays, day]
                        : settings.closedDays.filter((item) => item !== day),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn btn-primary mt-6" onClick={saveRules}>
          Save booking rules
        </button>
        {saved && (
          <p
            className="mt-3 text-sm font-bold text-[var(--forest-700)]"
            role="status"
          >
            Booking rules saved.
          </p>
        )}
      </section>
    </>
  );
}

export function AdminContentPage() {
  const [announcement, setAnnouncement] = useState("");
  const [offerings, setOfferings] = useState<HomeOffering[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    Promise.all([
      contentRepository.getAnnouncement(),
      homeOfferingRepository.list(),
      galleryRepository.list(),
    ]).then(([nextAnnouncement, nextOfferings, nextGallery]) => {
      setAnnouncement(nextAnnouncement);
      setOfferings(
        defaultHomeOfferings.map((fallback, index) => ({
          ...(nextOfferings.find((item) => item.id === fallback.id) ||
            fallback),
          sequence: index + 1,
          active: true,
        })),
      );
      setGallery(nextGallery.sort((a, b) => a.order - b.order));
    });
  }, []);
  const updateOffering = (id: string, patch: Partial<HomeOffering>) =>
    setOfferings((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateGallery = (id: string, patch: Partial<GalleryItem>) =>
    setGallery((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              ...(("consentConfirmed" in patch && !patch.consentConfirmed) ||
              ("placeholder" in patch && patch.placeholder) ||
              ("consentRecordReference" in patch &&
                !patch.consentRecordReference?.trim())
                ? { isClientResult: false }
                : {}),
            }
          : item,
      ),
    );
  return (
    <>
      <AdminHeading
        title="Public content"
        text="Edit frequently changing information without creating an unrestricted page builder."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-bold">Homepage announcement</h2>
          <div className="field mt-5">
            <label>Announcement text</label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Leave blank to hide"
            />
          </div>
          <button
            className="btn btn-primary mt-5"
            onClick={async () => {
              await contentRepository.saveAnnouncement(announcement);
              setSaved(true);
            }}
          >
            Save announcement
          </button>
          {saved && (
            <p
              className="mt-3 text-sm font-bold text-[var(--forest-700)]"
              role="status"
            >
              Announcement is now reflected on the homepage.
            </p>
          )}
        </section>
        <section className="surface p-5">
          <h2 className="font-bold">Managed content</h2>
          <div className="mt-4 rule-list text-sm">
            {[
              "Featured services",
              "FAQ entries",
              "Testimonials",
              "Result stories",
              "Contact information",
              "Social links",
              "Address",
              "Lead magnet status",
            ].map((label) => (
              <div
                key={label}
                className="flex min-h-12 items-center justify-between"
              >
                <span>{label}</span>
                <span className="status placeholder-badge">Seed data</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            These typed collections are ready for repository-backed editors.
            Demo content lives in the central data file until Firebase is
            configured.
          </p>
        </section>
        <section className="surface p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-bold">Homepage Care Loop</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Edit the four core offers and their destinations. Motion timing
                and care-path order remain fixed for accessibility and
                consistency.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await Promise.all(
                  offerings.map((item) => homeOfferingRepository.save(item)),
                );
                setSaved(true);
              }}
            >
              Save Care Loop
            </button>
          </div>
          <div className="mt-6 rule-list">
            {offerings.map((item) => (
              <article key={item.id} className="grid gap-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-2xl text-[var(--forest-950)]">
                    {String(item.sequence).padStart(2, "0")} {item.eyebrow}
                  </h3>
                  <span className="status">Core path · always active</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label>Offering label</label>
                    <input
                      value={item.eyebrow}
                      onChange={(event) =>
                        updateOffering(item.id, { eyebrow: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Image focal point</label>
                    <input
                      value={item.image.focalPoint || "center"}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          image: {
                            ...item.image,
                            focalPoint: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Title</label>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateOffering(item.id, { title: event.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Short description</label>
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      updateOffering(item.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label>Image URL</label>
                    <input
                      type="url"
                      value={item.image.src}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          image: { ...item.image, src: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Image alt text</label>
                    <input
                      value={item.image.alt}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          image: { ...item.image, alt: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Primary CTA label</label>
                    <input
                      value={item.primaryCta.label}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          primaryCta: {
                            ...item.primaryCta,
                            label: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Primary CTA destination</label>
                    <input
                      value={item.primaryCta.href}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          primaryCta: {
                            ...item.primaryCta,
                            href: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Secondary CTA label</label>
                    <input
                      value={item.secondaryCta?.label || ""}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          secondaryCta: {
                            label: event.target.value,
                            href: item.secondaryCta?.href || "",
                          },
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Secondary CTA destination</label>
                    <input
                      value={item.secondaryCta?.href || ""}
                      onChange={(event) =>
                        updateOffering(item.id, {
                          secondaryCta: {
                            label: item.secondaryCta?.label || "Learn more",
                            href: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="surface p-5 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-bold">Gallery records</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Public images use URL-backed records. Client results require
                explicit consent confirmation before they can be marked as such.
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() =>
                setGallery((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    image: "",
                    category: "clinic",
                    caption: "",
                    alt: "",
                    order: current.length + 1,
                    featured: false,
                    active: false,
                    consentConfirmed: false,
                    isClientResult: false,
                    placeholder: true,
                  },
                ])
              }
            >
              <Plus size={17} /> Add image record
            </button>
          </div>
          <div className="mt-6 rule-list">
            {gallery.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 py-6 lg:grid-cols-[180px_1fr]"
              >
                <div className="overflow-hidden rounded-[12px] bg-[var(--forest-100)]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center text-xs font-bold text-[var(--forest-700)]">
                      Add image URL
                    </div>
                  )}
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="field md:col-span-2">
                      <label>Image URL</label>
                      <input
                        type="url"
                        value={item.image}
                        onChange={(event) =>
                          updateGallery(item.id, { image: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Category</label>
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            category: event.target
                              .value as GalleryItem["category"],
                          })
                        }
                      >
                        <option value="trichology">Trichology</option>
                        <option value="natural-hair">Natural Hair</option>
                        <option value="clinic">Clinic</option>
                        <option value="products">Products</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Display order</label>
                      <input
                        type="number"
                        min="1"
                        value={item.order}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            order: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="field">
                      <label>Caption</label>
                      <textarea
                        value={item.caption}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            caption: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Alt text</label>
                      <textarea
                        value={item.alt}
                        onChange={(event) =>
                          updateGallery(item.id, { alt: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Related service ID (optional)</label>
                      <input
                        value={item.relatedServiceId || ""}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            relatedServiceId: event.target.value || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Consent record reference</label>
                      <input
                        value={item.consentRecordReference || ""}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            consentRecordReference:
                              event.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 text-xs font-bold">
                    <label>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            active: event.target.checked,
                          })
                        }
                      />{" "}
                      Visible
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.featured}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            featured: event.target.checked,
                          })
                        }
                      />{" "}
                      Featured
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.placeholder}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            placeholder: event.target.checked,
                          })
                        }
                      />{" "}
                      Placeholder
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.consentConfirmed}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            consentConfirmed: event.target.checked,
                          })
                        }
                      />{" "}
                      Consent confirmed
                    </label>
                    <label
                      title={
                        !item.consentConfirmed ||
                        !item.consentRecordReference?.trim() ||
                        item.placeholder
                          ? "Confirm consent, add its reference and remove placeholder status first"
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        disabled={
                          !item.consentConfirmed ||
                          !item.consentRecordReference?.trim() ||
                          item.placeholder
                        }
                        checked={item.isClientResult}
                        onChange={(event) =>
                          updateGallery(item.id, {
                            isClientResult: event.target.checked,
                          })
                        }
                      />{" "}
                      Genuine client result
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (
                          item.isClientResult &&
                          (!item.consentConfirmed ||
                            !item.consentRecordReference?.trim() ||
                            item.placeholder)
                        )
                          return;
                        await galleryRepository.save(item);
                        setSaved(true);
                      }}
                    >
                      Save image
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        const archived = { ...item, active: false };
                        await galleryRepository.save(archived);
                        updateGallery(item.id, { active: false });
                      }}
                    >
                      Archive
                    </button>
                    <button
                      className="btn text-[var(--danger)]"
                      onClick={async () => {
                        await galleryRepository.remove(item.id);
                        setGallery((current) =>
                          current.filter(
                            (candidate) => candidate.id !== item.id,
                          ),
                        );
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {saved && (
            <p
              className="mt-4 text-sm font-bold text-[var(--forest-700)]"
              role="status"
            >
              Content changes saved.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [policies, setPolicies] = useState<BookingPolicy[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    Promise.all([
      availabilityRepository.getPublic(),
      bookingConfigurationRepositories.policies.list(),
    ]).then(([nextSettings, nextPolicies]) => {
      setSettings(nextSettings);
      setPolicies(nextPolicies);
    });
  }, []);
  const setPayment = <K extends keyof BusinessSettings["payment"]>(
    key: K,
    value: BusinessSettings["payment"][K],
  ) =>
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, [key]: value },
    }));
  async function saveBookingSettings() {
    await availabilityRepository.saveSettings(settings);
    await Promise.all(
      policies.map((policy) =>
        bookingConfigurationRepositories.policies.save(policy),
      ),
    );
    setSaved(true);
  }
  return (
    <>
      <AdminHeading
        title="Settings"
        text="Configuration status and operating defaults."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Business name", "Tamlois Naturals & Trichology Clinic"],
          ["Timezone", "Africa/Lagos"],
          ["Payment mode", "Mock only"],
          ["Firebase", firebaseEnabled ? "Configured" : "Not configured"],
          [
            "Shopify",
            shopifyEnabled ? "Storefront connected" : "Demo products",
          ],
          ["Notifications", "Mock provider"],
          [
            "Authentication",
            firebaseEnabled ? "Firebase ready" : "Demo session",
          ],
          [
            "App Check",
            import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY
              ? "Configured"
              : "Not configured",
          ],
          [
            "Analytics",
            import.meta.env.VITE_GA_MEASUREMENT_ID
              ? "ID present"
              : "Console adapter",
          ],
        ].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
            <p className="mt-3 font-semibold text-[var(--forest-950)]">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
        <section className="surface p-5">
          <h2 className="font-bold text-[var(--forest-950)]">
            Payment and hold settings
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Demo supports full, percentage deposit and pay-at-clinic. Live
            Paystack must initialise and verify through a secure backend.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Default payment mode</label>
              <select
                value={settings.payment.defaultMode}
                onChange={(e) =>
                  setPayment(
                    "defaultMode",
                    e.target
                      .value as BusinessSettings["payment"]["defaultMode"],
                  )
                }
              >
                <option value="deposit_percentage">Percentage deposit</option>
                <option value="full">Full payment</option>
                <option value="deposit_fixed">Fixed deposit</option>
                <option value="clinic">Pay at clinic</option>
                <option value="disabled">Temporarily disabled</option>
              </select>
            </div>
            <div className="field">
              <label>Deposit percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.payment.depositPercentage}
                onChange={(e) =>
                  setPayment("depositPercentage", Number(e.target.value))
                }
              />
            </div>
            <div className="field">
              <label>Fixed deposit (NGN)</label>
              <input
                type="number"
                min="0"
                value={settings.payment.fixedDepositAmount}
                onChange={(e) =>
                  setPayment("fixedDepositAmount", Number(e.target.value))
                }
              />
            </div>
            <div className="field">
              <label>Slot hold (minutes)</label>
              <input
                type="number"
                min="5"
                max="30"
                value={settings.payment.holdMinutes}
                onChange={(e) =>
                  setPayment("holdMinutes", Number(e.target.value))
                }
              />
            </div>
            <div className="field">
              <label>Balance due</label>
              <select
                value={settings.payment.balanceDue}
                onChange={(e) =>
                  setPayment(
                    "balanceDue",
                    e.target.value as BusinessSettings["payment"]["balanceDue"],
                  )
                }
              >
                <option value="at-clinic">At clinic</option>
                <option value="before-appointment">Before appointment</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={settings.payment.approvalRequired}
                onChange={(e) =>
                  setPayment("approvalRequired", e.target.checked)
                }
              />
              Clinic approval required
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-bold">
                Enabled payment choices
              </legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    ["full", "Full"],
                    ["deposit_percentage", "Percentage deposit"],
                    ["deposit_fixed", "Fixed deposit"],
                    ["clinic", "At clinic"],
                  ] as const
                ).map(([mode, label]) => (
                  <label
                    className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm"
                    key={mode}
                  >
                    <input
                      type="checkbox"
                      checked={settings.payment.enabledModes.includes(mode)}
                      onChange={(e) =>
                        setPayment(
                          "enabledModes",
                          e.target.checked
                            ? [...settings.payment.enabledModes, mode]
                            : settings.payment.enabledModes.filter(
                                (item) => item !== mode,
                              ),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>
        <section className="surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-[var(--forest-950)]">
                Booking policies
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Edit summary, version, effective date and active status.
              </p>
            </div>
            <span className="status placeholder-badge">Placeholder</span>
          </div>
          <div className="rule-list mt-5">
            {policies.map((policy) => (
              <div className="grid gap-3 py-4" key={policy.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{policy.title}</strong>
                  <label className="text-xs">
                    <input
                      type="checkbox"
                      checked={policy.active}
                      onChange={(e) =>
                        setPolicies((items) =>
                          items.map((item) =>
                            item.id === policy.id
                              ? { ...item, active: e.target.checked }
                              : item,
                          ),
                        )
                      }
                    />{" "}
                    Active
                  </label>
                </div>
                <textarea
                  aria-label={`${policy.title} summary`}
                  className="control min-h-24"
                  value={policy.summary}
                  onChange={(e) =>
                    setPolicies((items) =>
                      items.map((item) =>
                        item.id === policy.id
                          ? { ...item, summary: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    aria-label={`${policy.title} version`}
                    className="control"
                    value={policy.version}
                    onChange={(e) =>
                      setPolicies((items) =>
                        items.map((item) =>
                          item.id === policy.id
                            ? { ...item, version: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`${policy.title} effective date`}
                    className="control"
                    type="date"
                    value={policy.effectiveFrom}
                    onChange={(e) =>
                      setPolicies((items) =>
                        items.map((item) =>
                          item.id === policy.id
                            ? { ...item, effectiveFrom: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <button className="btn btn-primary mt-6" onClick={saveBookingSettings}>
        Save booking configuration
      </button>
      {saved && (
        <p
          className="mt-3 text-sm font-bold text-[var(--forest-700)]"
          role="status"
        >
          Booking configuration saved.
        </p>
      )}
      <div className="mt-7 rounded-[14px] bg-[#fff0df] p-5 text-sm leading-6 text-[#713f1b]">
        <strong>Launch checklist:</strong> Firebase, owner account, App Check,
        contact information, policies, payment verification, email delivery,
        Shopify and analytics remain manual configuration items.
      </div>
    </>
  );
}
