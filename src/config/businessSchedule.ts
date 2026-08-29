/**
 * Tamlois' ordinary opening schedule is application configuration, not
 * Firestore content. Firestore stores dated exceptions only.
 */
export const BUSINESS_SCHEDULE = {
  timezone: "Africa/Lagos",
  openDays: [1, 2, 3, 4, 5, 6],
  openingTime: "09:00",
  closingTime: "18:00",
  bookingIntervalMinutes: 30,
  appointmentBufferMinutes: 15,
  minimumNoticeHours: 4,
  maximumAdvanceDays: 60,
  salonSessions: [
    {
      id: "morning",
      label: "Morning Session",
      startTime: "09:00",
      endTime: "12:00",
      capacity: 3,
    },
    {
      id: "afternoon",
      label: "Afternoon Session",
      startTime: "12:00",
      endTime: "15:00",
      capacity: 3,
    },
    {
      id: "evening",
      label: "Evening Session",
      startTime: "15:00",
      endTime: "18:00",
      capacity: 3,
    },
  ],
} as const;

export const schedulingModeForCategory = (category: "salon" | "trichology") =>
  category === "salon" ? "salon-session" : "precise-time";
