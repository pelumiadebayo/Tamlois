import { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
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
import {
  auth,
  firebaseEnabled,
  firebaseAdminUid,
} from "../lib/firebase";
import {
  hasConfiguredOwnerUid,
  isAuthorizedAdminUid,
  OWNER_UID_NOT_CONFIGURED_MESSAGE,
  UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE,
} from "../lib/adminAuthorization";
import { appRepositories } from "../repositories/app";
import { bookingConfigurationRepositories } from "../repositories/bookingConfigurationRepository";
import {
  AvailabilityBlockConflictError,
  availabilityRepository,
} from "../repositories/availabilityRepository";
import { shopifyEnabled } from "../lib/adapters";
import type {
  BlockedPeriod,
  Booking,
  BookingPolicy,
  BookingStatus,
  BusinessSettings,
  IntakeQuestion,
  Service,
  ServiceExtra,
} from "../types";

const adminLinks = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/services", "Services", Package],
  ["/admin/bookings", "Bookings", Users],
  ["/admin/availability", "Availability", CalendarClock],
  ["/admin/settings", "Settings", Settings],
] as const;

const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1 hour 30 minutes" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
] as const;

const isSupportedDuration = (duration: number) =>
  durationOptions.some((option) => option.value === duration);

function DurationSelectOptions({ current }: { current: number }) {
  return (
    <>
      {!isSupportedDuration(current) && (
        <option value={current} disabled>
          Unsupported duration ({current} minutes)
        </option>
      )}
      {durationOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

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
        if (!hasConfiguredOwnerUid(firebaseAdminUid)) {
          await signOut(auth);
          setError(OWNER_UID_NOT_CONFIGURED_MESSAGE);
          return;
        }
        if (!isAuthorizedAdminUid(credential.user.uid, firebaseAdminUid)) {
          await signOut(auth);
          setError(UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE);
          return;
        }
        navigate("/admin");
      } catch {
        setError("Sign-in failed. Check the account email and password.");
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
            {firebaseEnabled && (
              <button
                type="button"
                className="justify-self-start text-sm font-bold text-[var(--forest-800)] underline"
                onClick={async () => {
                  setError("");
                  if (!auth || !email.trim()) {
                    setError("Enter the owner's email address first.");
                    return;
                  }
                  try {
                    await sendPasswordResetEmail(auth, email.trim());
                    setError("Password reset email sent. Check the owner's inbox.");
                  } catch {
                    setError("The password reset email could not be sent.");
                  }
                }}
              >
                Reset password
              </button>
            )}
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
  const [state, setState] = useState<
    "loading" | "allowed" | "signed-out" | "unauthorized" | "misconfigured"
  >(() =>
    firebaseEnabled
      ? "loading"
      : isDemoAdmin()
        ? "allowed"
        : "signed-out",
  );
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState("signed-out");
        return;
      }
      if (!hasConfiguredOwnerUid(firebaseAdminUid)) {
        setState("misconfigured");
        return;
      }
      setState(
        isAuthorizedAdminUid(user.uid, firebaseAdminUid)
          ? "allowed"
          : "unauthorized",
      );
    });
  }, []);
  if (state === "loading")
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--forest-50)]">
        <p role="status">Checking administrator access...</p>
      </main>
    );
  if (state === "allowed") return <AdminLayout />;
  if (state === "signed-out") return <Navigate to="/admin/login" replace />;
  return (
    <AdminAccessNotice
      message={
        state === "misconfigured"
          ? OWNER_UID_NOT_CONFIGURED_MESSAGE
          : UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE
      }
    />
  );
}

function AdminAccessNotice({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--forest-50)] p-4">
      <section
        className="w-full max-w-md rounded-[14px] bg-white p-7 shadow-[0_24px_70px_rgba(13,45,33,.12)]"
        aria-labelledby="admin-access-title"
      >
        <Brand />
        <h1
          id="admin-access-title"
          className="mt-9 font-display text-4xl text-[var(--forest-950)]"
        >
          Administrator access denied
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]" role="alert">
          {message}
        </p>
        <button
          className="btn btn-primary mt-7"
          onClick={async () => {
            if (auth) await signOut(auth);
            navigate("/admin/login");
          }}
        >
          Sign out and return to login
        </button>
      </section>
    </main>
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
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = () => {
    setState("loading");
    return serviceRepository
      .list()
      .then((result) => {
        setItems(result.sort((a, b) => a.order - b.order));
        setState("ready");
      })
      .catch(() => setState("error"));
  };
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
        {state === "loading" && <p className="p-6" role="status">Loading services...</p>}
        {state === "error" && (
          <div className="p-6" role="alert">
            <p>Services could not be loaded.</p>
            <button className="btn btn-secondary mt-4" onClick={() => void load()}>Retry</button>
          </div>
        )}
        {state === "ready" && items.length === 0 && (
          <div className="p-8 text-center" role="status">
            <h2 className="font-display text-3xl">No services yet</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">Create the first Tamlois service, then publish it when its details are ready.</p>
            <Link to="/admin/services/new" className="btn btn-primary mt-5"><Plus size={17} />Create first service</Link>
          </div>
        )}
        {state === "ready" && items.length > 0 && <>
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
        </>}
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
                placeholder: false,
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
                <select
                  aria-label={`${extra.name} duration`}
                  className="control"
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
                >
                  <DurationSelectOptions current={extra.duration} />
                </select>
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
        archived: false,
        order: 1,
        displayOrder: 1,
        durationMinutes: 60,
        schedulingMode: "precise-time",
        image: "",
        imageAlt: "",
        variations: [],
        placeholder: false,
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
      !isSupportedDuration(item.duration) ||
      item.variations.some((variation) => !isSupportedDuration(variation.duration))
    ) {
      setPublishError(
        "Choose one of the available duration options for the service and every variation.",
      );
      return;
    }
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
    await serviceRepository.save({
      ...current,
      slug,
      archived: Boolean(current.archived),
      durationMinutes: current.duration,
      displayOrder: current.order,
      schedulingMode: current.category === "salon" ? "salon-session" : "precise-time",
      placeholder: false,
    });
    navigate("/admin/services");
  }
  async function remove() {
    if (!item || !confirm("Archive this service? It will disappear from public booking and catalogue pages.")) return;
    const current = item;
    await serviceRepository.save({ ...current, active: false, archived: true });
    navigate("/admin/services");
  }
  return (
    <>
      <AdminHeading
        title={isNew ? "New service" : "Edit service"}
        text="Create, review and publish the service shown in the public catalogue and booking flow."
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
            <label>Duration</label>
            <select
              aria-label="Duration"
              value={item.duration}
              onChange={(e) => set("duration", Number(e.target.value))}
            >
              <DurationSelectOptions current={item.duration} />
            </select>
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
                  <select
                    aria-label={`Variation ${index + 1} duration`}
                    value={variation.duration}
                    onChange={(e) =>
                      updateVariation(index, "duration", Number(e.target.value))
                    }
                    className="control"
                  >
                    <DurationSelectOptions current={variation.duration} />
                  </select>
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
    await bookingRepository.updateStatusAsAdmin(item.id, next);
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
                    await bookingRepository.saveInternalNotesAsAdmin(
                      item.id,
                      item.internalNotes,
                    );
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
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");
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
    setBlockError("");
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
    if (!reason.trim()) {
      setBlockError("Enter a reason for this booking block.");
      return;
    }
    const block = {
      id: crypto.randomUUID(),
      date,
      start: start || undefined,
      end: end || undefined,
      reason: reason.trim(),
    };
    setSavingBlock(true);
    try {
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
    } catch (error) {
      if (import.meta.env.DEV)
        console.error("Failed to save booking block", error);
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      setBlockError(
        error instanceof AvailabilityBlockConflictError ||
          code === "block-overlap"
          ? "This time overlaps an existing block. Remove the existing block before adding a replacement."
          : code === "permission-denied"
          ? "Firebase rejected this block. Deploy the current Firestore Rules and confirm you are signed in with the authorised owner account."
          : code === "unauthenticated"
            ? "Your administrator session has expired. Sign in again, then retry the block."
            : "The block could not be saved. Check your connection and try again.",
      );
    } finally {
      setSavingBlock(false);
    }
  }
  async function remove(id: string) {
    const next = await availabilityRepository.removeBlock(id, {
      ...settings,
      blockedPeriods: blocks,
    });
    setBlocks(next);
    setSettings((current) => ({ ...current, blockedPeriods: next }));
  }
  return (
    <>
      <AdminHeading
        title="Availability"
        text="Manage dated closures and partial-day exceptions to the source-controlled schedule."
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
              <label>
                {start || end ? "Internal reason" : "Reason shown on calendar"}
              </label>
              <input
                aria-label={
                  start || end
                    ? "Internal reason"
                    : "Reason shown on calendar"
                }
                required
                maxLength={start || end ? 500 : 160}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {blockError && (
              <p className="field-error" role="alert">
                {blockError}
              </p>
            )}
            <button className="btn btn-primary" disabled={savingBlock}>
              {savingBlock ? "Saving block…" : "Block time"}
            </button>
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Leave both times empty to block the full day. That reason is shown
            to customers on the booking calendar, so do not include private
            information. Reasons for timed blocks remain admin-only.
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
        <h2 className="font-bold">Normal booking schedule</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Monday-Saturday, 9:00 a.m.-6:00 p.m. in Africa/Lagos. Salon capacity is three places in each morning, afternoon and evening session. Trichology retains individually calculated appointment times.
        </p>
        <p className="mt-3 text-xs font-bold text-[var(--forest-700)]">
          This schedule is source-controlled. Firestore stores only blocks and capacity overrides.
        </p>
      </section>
    </>
  );
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [policies, setPolicies] = useState<BookingPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [policyForm, setPolicyForm] = useState({ title: "", summary: "" });
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [reorderingPolicies, setReorderingPolicies] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyMessage, setPolicyMessage] = useState("");
  const [deletingPolicy, setDeletingPolicy] = useState<BookingPolicy | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteInFlight = useRef(false);
  useEffect(() => {
    Promise.all([
      availabilityRepository.getPublic(),
      bookingConfigurationRepositories.policies.list(),
    ])
      .then(([nextSettings, nextPolicies]) => {
        setSettings(nextSettings);
        setPolicies(nextPolicies);
      })
      .catch((error) =>
        setPolicyError(
          error instanceof Error
            ? error.message
            : "Booking policies could not be loaded.",
        ),
      )
      .finally(() => setPoliciesLoading(false));
  }, []);
  useEffect(() => {
    if (!deletingPolicy) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteBusy) setDeletingPolicy(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteBusy, deletingPolicy]);
  const setPayment = <K extends keyof BusinessSettings["payment"]>(
    key: K,
    value: BusinessSettings["payment"][K],
  ) => {
    setSaved(false);
    setSettingsError("");
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, [key]: value },
    }));
  };
  function setDefaultPaymentMode(
    mode: BusinessSettings["payment"]["defaultMode"],
  ) {
    setSaved(false);
    setSettingsError("");
    setSettings((current) => ({
      ...current,
      payment: {
        ...current.payment,
        defaultMode: mode,
        enabledModes:
          mode === "disabled" || current.payment.enabledModes.includes(mode)
            ? current.payment.enabledModes
            : [...current.payment.enabledModes, mode],
      },
    }));
  }
  function togglePaymentMode(
    mode: Exclude<BusinessSettings["payment"]["defaultMode"], "disabled">,
    enabled: boolean,
  ) {
    setSaved(false);
    setSettingsError("");
    setSettings((current) => {
      const enabledModes = enabled
        ? [...new Set([...current.payment.enabledModes, mode])]
        : current.payment.enabledModes.filter((item) => item !== mode);
      return {
        ...current,
        payment: {
          ...current.payment,
          enabledModes,
          defaultMode:
            !enabled && current.payment.defaultMode === mode
              ? (enabledModes[0] ?? "disabled")
              : current.payment.defaultMode,
        },
      };
    });
  }
  async function saveBookingSettings() {
    if (savingSettings) return;
    const payment = settings.payment;
    if (payment.enabledModes.length === 0) {
      setSettingsError("Enable at least one payment choice before saving.");
      return;
    }
    if (
      payment.defaultMode !== "disabled" &&
      !payment.enabledModes.includes(payment.defaultMode)
    ) {
      setSettingsError("Enable the selected default payment choice before saving.");
      return;
    }
    if (
      payment.enabledModes.includes("deposit_fixed") &&
      (!Number.isInteger(payment.fixedDepositAmount) ||
        payment.fixedDepositAmount <= 0 ||
        payment.fixedDepositAmount > 10000000)
    ) {
      setSettingsError("Enter a fixed deposit amount greater than zero.");
      return;
    }
    if (
      !Number.isInteger(payment.depositPercentage) ||
      payment.depositPercentage < 1 ||
      payment.depositPercentage > 100
    ) {
      setSettingsError("Deposit percentage must be a whole number from 1 to 100.");
      return;
    }
    if (
      !Number.isInteger(payment.holdMinutes) ||
      payment.holdMinutes < 5 ||
      payment.holdMinutes > 30
    ) {
      setSettingsError("Slot hold must be a whole number from 5 to 30 minutes.");
      return;
    }
    setSavingSettings(true);
    setSettingsError("");
    setSaved(false);
    try {
      await availabilityRepository.saveSettings(settings);
      setSaved(true);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      setSettingsError(
        code === "permission-denied"
          ? "Firebase rejected these settings. Deploy the current Firestore Rules and confirm you are signed in with the authorised owner account."
          : "Payment and hold settings could not be saved. Check your connection and try again.",
      );
    } finally {
      setSavingSettings(false);
    }
  }
  function resetPolicyForm() {
    setEditingPolicyId(null);
    setPolicyForm({ title: "", summary: "" });
    setPolicyError("");
  }
  function editPolicy(policy: BookingPolicy) {
    setEditingPolicyId(policy.id);
    setPolicyForm({ title: policy.title, summary: policy.summary });
    setPolicyError("");
    setPolicyMessage("");
  }
  async function submitPolicy(event: React.FormEvent) {
    event.preventDefault();
    if (policyBusy) return;
    setPolicyBusy(true);
    setPolicyError("");
    setPolicyMessage("");
    try {
      if (editingPolicyId) {
        const updated =
          await bookingConfigurationRepositories.policies.updateAsAdmin(
            editingPolicyId,
            policyForm,
          );
        setPolicies((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        setPolicyMessage(`“${updated.title}” was updated.`);
      } else {
        const created =
          await bookingConfigurationRepositories.policies.createAsAdmin(
            policyForm,
          );
        setPolicies((items) => [...items, created]);
        setPolicyMessage(`“${created.title}” was created.`);
      }
      resetPolicyForm();
    } catch (error) {
      setPolicyError(
        error instanceof Error ? error.message : "The policy could not be saved.",
      );
    } finally {
      setPolicyBusy(false);
    }
  }
  async function movePolicy(id: string, direction: -1 | 1) {
    if (reorderingPolicies) return;
    const index = policies.findIndex((policy) => policy.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= policies.length) return;
    const reordered = [...policies];
    [reordered[index], reordered[destination]] = [
      reordered[destination],
      reordered[index],
    ];
    setReorderingPolicies(true);
    setPolicyError("");
    try {
      await bookingConfigurationRepositories.policies.reorderAsAdmin(
        reordered.map((policy) => policy.id),
      );
      setPolicies(
        reordered.map((policy, displayOrder) => ({
          ...policy,
          displayOrder,
        })),
      );
      setPolicyMessage("Policy order was updated.");
    } catch (error) {
      setPolicyError(
        error instanceof Error
          ? error.message
          : "The policy order could not be updated.",
      );
    } finally {
      setReorderingPolicies(false);
    }
  }
  async function permanentlyDeletePolicy() {
    if (!deletingPolicy || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteBusy(true);
    setPolicyError("");
    try {
      await bookingConfigurationRepositories.policies.deleteAsAdmin(
        deletingPolicy.id,
      );
      setPolicies((items) =>
        items.filter((item) => item.id !== deletingPolicy.id),
      );
      if (editingPolicyId === deletingPolicy.id) resetPolicyForm();
      setPolicyMessage(`“${deletingPolicy.title}” was permanently deleted.`);
      setDeletingPolicy(null);
    } catch (error) {
      setPolicyError(
        error instanceof Error
          ? error.message
          : "The policy could not be deleted.",
      );
    } finally {
      deleteInFlight.current = false;
      setDeleteBusy(false);
    }
  }
  return (
    <>
      <AdminHeading
        title="Settings"
        text="Configuration status and operating defaults."
      />
      {/* <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      </div> */}
      <div className="mt-7 grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
        <section className="surface p-5">
          <h2 className="font-bold text-[var(--forest-950)]">
            Payment and hold settings
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            These values are saved to Firebase and reused after refresh. Online
            collection still requires a verified payment backend.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>Default payment mode</label>
              <select
                value={settings.payment.defaultMode}
                onChange={(e) =>
                  setDefaultPaymentMode(
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
                min="1"
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
                min="1"
                max="10000000"
                step="500"
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
                        togglePaymentMode(mode, e.target.checked)
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
                Every saved policy is public. Editing its wording creates the
                next numeric version.
              </p>
            </div>
            {editingPolicyId && (
              <button
                className="btn btn-secondary shrink-0"
                disabled={policiesLoading}
                type="button"
                onClick={resetPolicyForm}
              >
                <Plus size={16} /> New policy
              </button>
            )}
          </div>

          <form
            aria-busy={policiesLoading || policyBusy}
            className="mt-6"
            onSubmit={submitPolicy}
          >
            <h3 className="text-sm font-bold text-[var(--forest-950)]">
              {editingPolicyId
                ? "Edit policy"
                : policies.length
                  ? "Create another policy"
                  : "Create the first policy"}
            </h3>
            <div className="mt-4 grid gap-4">
              <div className="field">
                <label htmlFor="policy-title">Policy title</label>
                <input
                  id="policy-title"
                  disabled={policiesLoading}
                  maxLength={160}
                  required
                  value={policyForm.title}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="policy-summary">Policy summary</label>
                <textarea
                  id="policy-summary"
                  className="min-h-28"
                  disabled={policiesLoading}
                  maxLength={3000}
                  required
                  value={policyForm.summary}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn btn-primary"
                  disabled={policiesLoading || policyBusy}
                  type="submit"
                >
                  {policyBusy
                    ? "Saving policy…"
                    : editingPolicyId
                      ? "Save policy changes"
                      : "Create policy"}
                </button>
                {editingPolicyId && (
                  <button
                    className="btn btn-secondary"
                    disabled={policyBusy}
                    type="button"
                    onClick={resetPolicyForm}
                  >
                    Cancel editing
                  </button>
                )}
              </div>
            </div>
          </form>

          {policyError && (
            <p className="mt-4 text-sm font-bold text-[var(--danger)]" role="alert">
              {policyError}
            </p>
          )}
          {policyMessage && (
            <p className="mt-4 text-sm font-bold text-[var(--forest-700)]" role="status">
              {policyMessage}
            </p>
          )}

          {policiesLoading ? (
            <p className="mt-6 text-sm text-[var(--muted)]" role="status">
              Loading booking policies…
            </p>
          ) : !policies.length ? (
            <div className="mt-6 rounded-[12px] bg-[var(--forest-50)] p-5">
              <h3 className="font-bold text-[var(--forest-950)]">
                No booking policies yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Create the first policy to enable customers to review consent
                terms and continue through booking.
              </p>
            </div>
          ) : (
            <div className="rule-list mt-6" aria-label="Booking policy order">
            {policies.map((policy, index) => (
              <article className="grid gap-3 py-5" key={policy.id}>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--forest-950)] [overflow-wrap:anywhere]">
                      {policy.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      Version {policy.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label={`Move ${policy.title} up`}
                      className="grid size-11 place-items-center rounded-full text-[var(--forest-800)] hover:bg-[var(--forest-50)]"
                      disabled={
                        reorderingPolicies || index === 0
                      }
                      title="Move up"
                      type="button"
                      onClick={() => movePolicy(policy.id, -1)}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      aria-label={`Move ${policy.title} down`}
                      className="grid size-11 place-items-center rounded-full text-[var(--forest-800)] hover:bg-[var(--forest-50)]"
                      disabled={
                        reorderingPolicies ||
                        index === policies.length - 1
                      }
                      title="Move down"
                      type="button"
                      onClick={() => movePolicy(policy.id, 1)}
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      aria-label={`Edit ${policy.title}`}
                      className="grid size-11 place-items-center rounded-full text-[var(--forest-800)] hover:bg-[var(--forest-50)]"
                      title="Edit policy"
                      type="button"
                      onClick={() => editPolicy(policy)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      aria-label={`Permanently delete ${policy.title}`}
                      className="grid size-11 place-items-center rounded-full text-[var(--danger)] hover:bg-[#fff0ec]"
                      title="Permanently delete policy"
                      type="button"
                      onClick={() => setDeletingPolicy(policy)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-6 text-[var(--muted)] [overflow-wrap:anywhere]">
                  {policy.summary}
                </p>
              </article>
            ))}
            </div>
          )}
        </section>
      </div>
      {deletingPolicy && (
        <div
          aria-labelledby="delete-policy-title"
          aria-describedby="delete-policy-description"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-end bg-[rgba(13,45,33,.46)] sm:place-items-center sm:p-5"
          role="dialog"
          onMouseDown={(event) => {
            if (!deleteBusy && event.target === event.currentTarget)
              setDeletingPolicy(null);
          }}
        >
          <div className="w-full max-w-lg rounded-t-[14px] bg-white p-6 shadow-[0_24px_80px_rgba(13,45,33,.24)] sm:rounded-[14px] sm:p-7">
            <h2
              className="font-display text-3xl text-[var(--forest-950)]"
              id="delete-policy-title"
            >
              Permanently delete this policy?
            </h2>
            <p
              className="mt-4 text-sm leading-6 text-[var(--muted)]"
              id="delete-policy-description"
            >
              You are deleting <strong>“{deletingPolicy.title}”</strong>. It
              will disappear from future bookings. Existing booking records
              keep the policy title, summary and version previously accepted.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                autoFocus
                className="btn btn-primary"
                disabled={deleteBusy}
                type="button"
                onClick={() => setDeletingPolicy(null)}
              >
                Keep policy
              </button>
              <button
                className="btn border border-[var(--danger)] bg-transparent text-[var(--danger)] hover:bg-[#fff0ec]"
                disabled={deleteBusy}
                type="button"
                onClick={permanentlyDeletePolicy}
              >
                <Trash2 size={17} />
                {deleteBusy ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        className="btn btn-primary mt-6"
        disabled={savingSettings}
        type="button"
        onClick={saveBookingSettings}
      >
        {savingSettings ? "Saving settings…" : "Save payment settings"}
      </button>
      {settingsError && (
        <p className="field-error mt-3" role="alert">
          {settingsError}
        </p>
      )}
      {saved && (
        <p
          className="mt-3 text-sm font-bold text-[var(--forest-700)]"
          role="status"
        >
          Payment settings saved.
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
