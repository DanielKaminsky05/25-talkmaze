"use client";

import Pagination from "@/src/components/common/Pagination";
import {
  usePendingBookings,
  ITEMS_PER_PAGE,
} from "./_hooks/usePendingBookings";
import PendingBookingCard from "./_components/PendingBookingCard";
import PendingBookingDetail from "./_components/PendingBookingDetail";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";

/**
 * Admin page for reviewing and approving pending session bookings.
 */
export default function PendingPage() {
  useDocumentTitle("Pending");
  const {
    pendingBookings,
    pendingBookingsLoading,
    paginatedBookings,
    currentPage,
    totalPages,
    setCurrentPage,
    approvingBookingId,
    editingBookingId,
    savingBookingId,
    selectedPendingBooking,
    selectedPendingBookingForm,
    pendingPreview,
    pendingPreviewLoading,
    pendingPreviewError,
    pendingPreviewInitialDate,
    employees,
    fetchPendingBookings,
    handleApprovePendingBooking,
    startEditingPendingBooking,
    cancelEditingPendingBooking,
    updateEditingBookingForm,
    handleSavePendingBooking,
    setSelectedPendingBookingId,
  } = usePendingBookings();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-white text-xl font-bold">Pending Bookings</h2>
          <p className="text-white/35 text-sm mt-1">
            Edit a pending match and preview how approval will affect the coach
            calendar.
          </p>
        </div>
        <button
          onClick={fetchPendingBookings}
          className="shrink-0 min-h-[44px] md:min-h-0 px-3.5 py-2 text-xs font-semibold text-[#1F2E3B] bg-[#B1E7D6] hover:bg-[#9ed4c1] rounded-xl transition-colors"
        >
          Refresh
        </button>
      </div>

      {pendingBookingsLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-[#B1E7D6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pendingBookings.length === 0 ? (
        <div className="bg-[#1F2E3B] rounded-2xl p-8 border border-white/5 text-center">
          <p className="text-white/35 text-sm">No pending bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
          {/* Left column: paginated booking list */}
          <div>
            <div className="space-y-2">
              {paginatedBookings.map((booking) => (
                <PendingBookingCard
                  key={booking.id}
                  booking={booking}
                  isSelected={selectedPendingBooking?.id === booking.id}
                  onClick={() => {
                    setSelectedPendingBookingId(booking.id);
                    // Exit edit mode when switching to a different booking.
                    if (editingBookingId !== booking.id)
                      cancelEditingPendingBooking();
                  }}
                />
              ))}
            </div>
            {/* Renders nothing when there is only one page */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={pendingBookings.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Right column: edit form + calendar preview for the selected booking */}
          {selectedPendingBooking && selectedPendingBookingForm && (
            <PendingBookingDetail
              form={selectedPendingBookingForm}
              employees={employees}
              preview={pendingPreview}
              previewLoading={pendingPreviewLoading}
              previewError={pendingPreviewError}
              isEditing={editingBookingId === selectedPendingBooking.id}
              isSaving={savingBookingId === selectedPendingBooking.id}
              isApproving={approvingBookingId === selectedPendingBooking.id}
              initialCalendarDate={pendingPreviewInitialDate}
              onFormChange={updateEditingBookingForm}
              onSave={() => handleSavePendingBooking(selectedPendingBooking.id)}
              onApprove={() =>
                handleApprovePendingBooking(selectedPendingBooking.id)
              }
              onStartEditing={() =>
                startEditingPendingBooking(selectedPendingBooking)
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
