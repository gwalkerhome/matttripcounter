/**
 * SCHENGEN ENGINE - The Single Source of Truth for 90/180 Logic
 */

const SchengenEngine = {
    // Helper: Convert string YYYY-MM-DD to a Date object at Noon to avoid timezone shifts
    parseDate(dateStr) {
        return new Date(dateStr + 'T12:00:00');
    },

    // 1. THE CORE CALCULATOR
    // Takes a list of trips and a "checkDate" (usually today or a future entry date)
    calculateStatus(trips, checkDate = new Date()) {
        const referenceDate = new Date(checkDate);
        referenceDate.setHours(12, 0, 0, 0);

        // The 180-day rolling window starts 179 days ago
        const windowStart = new Date(referenceDate);
        windowStart.setDate(windowStart.getDate() - 179);

        let daysUsed = 0;

        trips.forEach(trip => {
            const entry = this.parseDate(trip.entry);
            const exit = this.parseDate(trip.exit);

            // Only count trips that end within or after the 180-day window
            if (exit >= windowStart) {
                // Determine the actual start of counting for this trip
                // (Either the actual entry or the window start, whichever is later)
                const effectiveEntry = entry < windowStart ? windowStart : entry;
                
                // Only count up to the reference date (for "as of today" logic)
                const effectiveExit = exit > referenceDate ? referenceDate : exit;

                if (effectiveExit >= effectiveEntry) {
                    const diffTime = Math.abs(effectiveExit - effectiveEntry);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    daysUsed += diffDays;
                }
            }
        });

        return {
            used: daysUsed,
            remaining: Math.max(0, 90 - daysUsed),
            windowStart: windowStart.toISOString().split('T')[0],
            referenceDate: referenceDate.toISOString().split('T')[0]
        };
    },

    // 2. THE "HOW LONG CAN I STAY" TOOL
    // Calculates max exit date based on a planned entry date
    calculateMaxStay(allTrips, plannedEntryStr) {
        let entry = this.parseDate(plannedEntryStr);
        let maxDays = 0;
        let testExit = new Date(entry);

        // We simulate day-by-day to account for the "Leaky Bucket"
        // As Matt stays, older days drop off the back of the 180-day window
        while (true) {
            const tempTrip = { entry: plannedEntryStr, exit: testExit.toISOString().split('T')[0] };
            const status = this.calculateStatus([...allTrips, tempTrip], testExit);
            
            if (status.used > 90) break; // He hit the limit!

            maxDays++;
            testExit.setDate(testExit.getDate() + 1);
            
            // Safety break (Schengen trips can't exceed 90 days anyway)
            if (maxDays > 100) break;
        }

        return {
            maxDays: maxDays,
            lastPossibleExit: new Date(testExit.setDate(testExit.getDate() - 1)).toISOString().split('T')[0]
        };
    }
};
