export class StatsRepository {
    constructor() {
        this.storageKey = 'acordes_stats';
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    save(stats) {
        localStorage.setItem(this.storageKey, JSON.stringify(stats));
    }

    record(chordTypeId, wasCorrect) {
        const stats = this.load();
        const currentStat = stats[chordTypeId] || { correct: 0, total: 0 };

        currentStat.total += 1;
        if (wasCorrect) {
            currentStat.correct += 1;
        }

        stats[chordTypeId] = currentStat;
        this.save(stats);
        return stats;
    }

    clear() {
        localStorage.removeItem(this.storageKey);
    }
}
