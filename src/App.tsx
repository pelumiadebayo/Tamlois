import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { firebaseConfigurationError } from "./lib/firebase";

const Home = lazy(() => import("./pages/Home"));
const ServicesPage = lazy(() =>
  import("./pages/Catalogue").then((m) => ({ default: m.ServicesPage })),
);
const PackagesPage = lazy(() =>
  import("./pages/Catalogue").then((m) => ({ default: m.PackagesPage })),
);
const ServiceDetailPage = lazy(() =>
  import("./pages/Catalogue").then((m) => ({ default: m.ServiceDetailPage })),
);
const ConcernsPage = lazy(() =>
  import("./pages/Concerns").then((m) => ({ default: m.ConcernsPage })),
);
const ConcernDetailPage = lazy(() =>
  import("./pages/Concerns").then((m) => ({ default: m.ConcernDetailPage })),
);
const ShopPage = lazy(() => import("./pages/Shop"));
const BookingPage = lazy(() => import("./pages/Booking"));
const BookingConfirmationPage = lazy(() =>
  import("./pages/Booking").then((m) => ({
    default: m.BookingConfirmationPage,
  })),
);
const AboutPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.AboutPage })),
);
const ResultsPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.ResultsPage })),
);
const GalleryPage = lazy(() => import("./pages/Gallery"));
const FAQPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.FAQPage })),
);
const ContactPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.ContactPage })),
);
const LegalPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.LegalPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/ContentPages").then((m) => ({ default: m.NotFoundPage })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminLoginPage })),
);
const ProtectedAdmin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.ProtectedAdmin })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminServicesPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminServicesPage })),
);
const AdminServiceEditorPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminServiceEditorPage })),
);
const AdminBookingsPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminBookingsPage })),
);
const AdminAvailabilityPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminAvailabilityPage })),
);
const AdminSettingsPage = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminSettingsPage })),
);

function LoadingPage() {
  return (
    <div className="container-shell section-space" role="status">
      <div className="h-14 max-w-lg animate-pulse rounded-[12px] bg-[var(--forest-100)]" />
      <div className="mt-5 h-5 max-w-xl animate-pulse rounded bg-[var(--forest-100)]" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}

export default function App() {
  if (firebaseConfigurationError)
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--forest-50)] p-5">
        <section className="surface max-w-xl p-8" role="alert">
          <h1 className="font-display text-4xl text-[var(--forest-950)]">
            Firebase configuration required
          </h1>
          <p className="mt-4 leading-7 text-[var(--muted)]">
            {firebaseConfigurationError} The application will not fall back to demo data while Firebase mode is selected.
          </p>
        </section>
      </main>
    );
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/concerns" element={<ConcernsPage />} />
          <Route path="/concerns/:slug" element={<ConcernDetailPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route
            path="/booking/confirmation"
            element={<BookingConfirmationPage />}
          />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route
            path="/cancellation-policy"
            element={<LegalPage kind="cancellation" />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedAdmin />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="services/new" element={<AdminServiceEditorPage />} />
          <Route path="services/:id" element={<AdminServiceEditorPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="availability" element={<AdminAvailabilityPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
