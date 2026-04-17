import { useState, useEffect } from "react";
import { isPastDate } from "../../utils/timezone";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  CalendarDays,
  ClipboardList,
  Wallet,
  Settings,
  ArrowLeft,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getDoctorAvailability,
  bookAppointment,
} from "../../api/patientService";
import Loader from "../../components/ui/Loader";
import Alert from "../../components/ui/Alert";

//  Nav

const PATIENT_NAV = [
  {
    label: "Overview",
    path: "/patient/overview",
    icon: <HeartPulse size={18} />,
  },
  {
    label: "Appointments",
    path: "/patient/appointments",
    icon: <CalendarDays size={18} />,
  },
  {
    label: "Prescriptions",
    path: "/patient/prescriptions",
    icon: <ClipboardList size={18} />,
  },
  {
    label: "Payments",
    path: "/patient/payments",
    icon: <Wallet size={18} />,
  },
  {
    label: "Settings",
    path: "/patient/settings",
    icon: <Settings size={18} />,
  },
];

function formatSlotDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Group availability array [{ date, timeslots[] }] by date,
// filtering out any dates that are strictly before today.
function groupByDate(availability) {
  const today = new Date().toISOString().split("T")[0];
  const grouped = {};
  for (const day of availability) {
    if (day.date >= today) {
      grouped[day.date] = day.timeslots ?? [];
    }
  }
  return grouped;
}

//  Main page

export default function PatientBookingPage() {
  const { doctorId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // Doctor data passed via navigate(..., { state: { doctor } })
  const doctor = state?.doctor ?? null;

  // Availability
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selected slot
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking form
  const [notes, setNotes] = useState("");
  const [apptType, setApptType] = useState("PHYSICAL");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookSuccess, setBookSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    getDoctorAvailability(doctorId)
      .then((res) => {
        const data = res.data?.data ?? [];
        setAvailability(data);
        // Pre-select today's date if the doctor has availability for it
        const today = new Date().toISOString().split("T")[0];
        const hasToday = data.some((d) => d.date === today);
        if (hasToday) setSelectedDate(today);
      })
      .catch(() => setError("Could not load doctor availability."))
      .finally(() => setLoading(false));
  }, [doctorId]);

  const grouped = groupByDate(availability);
  // Hide past dates (timezone-aware) so patients can only book today or later.
  const sortedDates = Object.keys(grouped)
    .filter((d) => !isPastDate(d))
    .sort();

  // clicking the same slot deselects it
  const handleSlotClick = (date, slot) => {
    if (slot.isBooked) return;
    const alreadySelected =
      selectedDate === date &&
      selectedSlot?.startTime === slot.startTime &&
      selectedSlot?.phase === slot.phase;

    if (alreadySelected) {
      setSelectedDate(null);
      setSelectedSlot(null);
    } else {
      setSelectedDate(date);
      setSelectedSlot(slot);
      setBookError("");
      setBookSuccess("");
      setNotes("");
      setApptType("PHYSICAL");
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setBookError("");
    setBooking(true);
    try {
      await bookAppointment({
        doctorId,
        date: selectedDate,
        phase: selectedSlot.phase,
        type: apptType,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(doctor?.consultationFee != null && {
          consultationFee: doctor.consultationFee,
        }),
      });
      setBookSuccess("Appointment booked successfully! Redirecting…");
      setTimeout(() => navigate("/patient/appointments"), 1800);
    } catch (err) {
      setBookError(
        err.response?.data?.message ?? "Failed to book appointment.",
      );
    } finally {
      setBooking(false);
    }
  };

  return (
    <DashboardLayout navItems={PATIENT_NAV}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/*  Page header  */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {doctor
                ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                : "Doctor Availability"}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {doctor?.specialization
                ? doctor.specialization
                : "Select an available slot to book your appointment."}
            </p>
          </div>
        </div>

        {/*  Doctor info banner  */}
        {doctor && (
          <div className="rounded-xl border border-border bg-bg-card px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Dr. {doctor.firstName} {doctor.lastName}
              </p>
              {doctor.specialization && (
                <p className="text-xs text-text-muted mt-0.5">
                  {doctor.specialization}
                </p>
              )}
            </div>
            {doctor.consultationFee != null && (
              <div className="text-right shrink-0">
                <p className="text-[11px] text-text-muted">Consultation Fee</p>
                <p className="text-sm font-semibold text-primary">
                  LKR {doctor.consultationFee}
                </p>
              </div>
            )}
          </div>
        )}

        {/*  Availability content  */}
        {loading ? (
          <div className="py-20">
            <Loader />
          </div>
        ) : error ? (
          <Alert type="error">{error}</Alert>
        ) : sortedDates.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card px-6 py-12 text-center">
            <p className="text-sm text-text-muted">
              This doctor has no availability set up yet.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-4 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date heading */}
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={14} className="text-primary shrink-0" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    {formatSlotDate(date)}
                  </h2>
                </div>

                {/* Slots grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grouped[date].map((slot, i) => {
                    const isSelected =
                      selectedDate === date &&
                      selectedSlot?.startTime === slot.startTime &&
                      selectedSlot?.phase === slot.phase;
                    const isBooked = slot.isBooked;

                    return (
                      <div key={i}>
                        {/* Slot card */}
                        <button
                          type="button"
                          disabled={isBooked}
                          onClick={() => handleSlotClick(date, slot)}
                          className={[
                            "w-full rounded-xl border p-4 text-left transition-all",
                            isBooked
                              ? "border-border bg-bg-main opacity-50 cursor-not-allowed"
                              : isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border bg-bg-card hover:border-primary/50",
                          ].join(" ")}
                        >
                          {/* Top row: phase label + availability badge */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-text-muted font-medium">
                                {slot.phase}
                              </p>
                              {doctor?.specialization && (
                                <p className="text-sm font-semibold text-text-primary mt-0.5">
                                  {doctor.specialization}
                                </p>
                              )}
                            </div>
                            <span
                              className={[
                                "shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border",
                                isBooked
                                  ? "bg-bg-main text-text-muted border-border"
                                  : "bg-success-bg text-success border-success/30",
                              ].join(" ")}
                            >
                              {isBooked ? "Booked" : "Available"}
                            </span>
                          </div>

                          {/* Bottom row: start time + fee */}
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">
                              {formatTime(slot.startTime)}
                            </p>
                            {doctor?.consultationFee != null && (
                              <p className="text-xs text-text-secondary">
                                LKR {doctor.consultationFee}
                              </p>
                            )}
                          </div>
                        </button>

                        {/* Inline booking form — expands below the selected slot */}
                        {isSelected && (
                          <div className="mt-2 rounded-xl border border-primary/30 bg-bg-card p-5 space-y-4">
                            <p className="text-sm font-semibold text-text-primary">
                              Confirm Booking
                            </p>

                            {/* Read-only summary */}
                            <div className="rounded-lg bg-bg-main border border-border px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-text-muted mb-0.5">Doctor</p>
                                <p className="text-text-primary font-medium">
                                  {doctor
                                    ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                                    : "Unknown Doctor"}
                                </p>
                              </div>
                              <div>
                                <p className="text-text-muted mb-0.5">Date</p>
                                <p className="text-text-primary font-medium">
                                  {date}
                                </p>
                              </div>
                              <div>
                                <p className="text-text-muted mb-0.5">Time</p>
                                <p className="text-text-primary font-medium">
                                  {formatTime(slot.startTime)}
                                </p>
                              </div>
                              <div>
                                <p className="text-text-muted mb-0.5">
                                  Session
                                </p>
                                <p className="text-text-primary font-medium capitalize">
                                  {slot.phase}
                                </p>
                              </div>
                            </div>

                            {bookError && (
                              <Alert type="error">{bookError}</Alert>
                            )}
                            {bookSuccess && (
                              <Alert type="success">{bookSuccess}</Alert>
                            )}

                            <form
                              onSubmit={handleBook}
                              noValidate
                              className="space-y-4"
                            >
                              {/* Appointment type */}
                              <div>
                                <p className="text-sm font-medium text-text-primary mb-2">
                                  Appointment Type
                                </p>
                                <div className="flex gap-3">
                                  {["PHYSICAL", "VIRTUAL"].map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setApptType(t)}
                                      className={[
                                        "flex-1 py-2.5 rounded-lg text-sm font-semibold border capitalize transition-colors",
                                        apptType === t
                                          ? "bg-primary text-white border-primary"
                                          : "border-border text-text-secondary hover:border-primary hover:text-primary",
                                      ].join(" ")}
                                    >
                                      {t.charAt(0) + t.slice(1).toLowerCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Notes */}
                              <div>
                                <label
                                  htmlFor={`book-notes-${date}-${i}`}
                                  className="block text-sm font-medium text-text-primary mb-1.5"
                                >
                                  Notes{" "}
                                  <span className="text-text-muted font-normal">
                                    (optional)
                                  </span>
                                </label>
                                <textarea
                                  id={`book-notes-${date}-${i}`}
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Describe your symptoms or reason for visit…"
                                  rows={3}
                                  maxLength={500}
                                  className="
                                    w-full px-4 py-2.5 rounded-lg text-sm resize-none
                                    bg-bg-main text-text-primary border border-border
                                    placeholder:text-text-muted
                                    focus:outline-none focus:border-primary
                                  "
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(null);
                                    setSelectedSlot(null);
                                  }}
                                  className="flex-1 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={booking || !!bookSuccess}
                                  className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                  {booking ? "Booking…" : "Confirm Booking"}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
