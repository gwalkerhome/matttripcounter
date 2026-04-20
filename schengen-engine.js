/**
 * SCHENGEN ENGINE - The Single Source of Truth for 90/180 Logic
 */

const SchengenEngine = {
    parseDate(dateStr) {
        return new Date(dateStr + 'T12:00:00');
    },

    calculateStatus(trips, checkDate = new Date()) {
        const referenceDate = new Date(checkDate);
        referenceDate.setHours(12, 0, 0, 0);

        const windowStart = new Date(referenceDate);
        windowStart.setDate(windowStart.getDate() - 179);

        let daysUsed = 0;

        trips.forEach(trip => {
            const entry = this.parseDate(trip.entry);
            const exit = this.parseDate(trip.exit);

            if (exit >= windowStart) {
                const effectiveEntry = entry < windowStart ? windowStart : entry;
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

    getNextIncrease(trips, checkDate = new Date()) {
        const status = this.calculateStatus(trips, checkDate);
        const windowStart = this.parseDate(status.windowStart);
        const refDate = this.parseDate(status.referenceDate);

        const activeTrips = trips
            .map(t => ({ entry: this.parseDate(t.entry), exit: this.parseDate(t.exit) }))
            .filter(t => t.exit >= windowStart && t.entry <= refDate)
            .sort((a, b) => a.entry - b.entry);

        if (activeTrips.length === 0) return null;

        const firstTrip = activeTrips[0];
        const firstDayInWindow = firstTrip.entry < windowStart ? windowStart : firstTrip.entry;

        const recoveryDate = new Date(firstDayInWindow);
        recoveryDate.setDate(recoveryDate.getDate() + 180);

        const effectiveExit = firstTrip.exit > refDate ? refDate : firstTrip.exit;
        const diffTime = Math.abs(effectiveExit - firstDayInWindow);
        const blockDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return {
            days: blockDays,
            date: recoveryDate.toISOString().split('T')[0]
        };
    },

    calculateMaxStay(allTrips, plannedEntryStr) {
        let entry = this.parseDate(plannedEntryStr);
        let maxDays = 0;
        let testExit = new Date(entry);

        while (true) {
            const tempTrip = { entry: plannedEntryStr, exit: testExit.toISOString().split('T')[0] };
            const status = this.calculateStatus([...allTrips, tempTrip], testExit);
            if (status.used > 90) break;
            maxDays++;
            testExit.setDate(testExit.getDate() + 1);
            if (maxDays > 100) break;
        }

        return {
            maxDays: maxDays,
            lastPossibleExit: new Date(testExit.setDate(testExit.getDate() - 1)).toISOString().split('T')[0]
        };
    }
};
