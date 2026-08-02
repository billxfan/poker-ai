import Foundation

protocol IChipStorage {
    func getChips() -> Int
    func setChips(_ amount: Int)
    func addChips(_ amount: Int)
    func deductChips(_ amount: Int) -> Bool
}

final class ChipStorage: IChipStorage {
    private let userDefaults: UserDefaults
    private let key = "poker_ai_chips"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    func getChips() -> Int {
        return userDefaults.integer(forKey: key)
    }

    func setChips(_ amount: Int) {
        userDefaults.set(max(0, amount), forKey: key)
    }

    func addChips(_ amount: Int) {
        let current = getChips()
        setChips(current + amount)
    }

    func deductChips(_ amount: Int) -> Bool {
        let current = getChips()
        if current >= amount {
            setChips(current - amount)
            return true
        }
        return false
    }
}

final class WelfareStorage: IChipStorage {
    private let userDefaults: UserDefaults
    private let nowProvider: () -> Date
    private let chipsKey = "poker_ai_chips"
    private let dailyFreeKey = "poker_ai_daily_free"
    private let signInKey = "poker_ai_sign_in"
    private let lastResetKey = "poker_ai_last_reset"
    private let lastDailyFreeGrantAnchorKey = "poker_ai_daily_free_grant_anchor"

    init(userDefaults: UserDefaults = .standard, nowProvider: @escaping () -> Date = Date.init) {
        self.userDefaults = userDefaults
        self.nowProvider = nowProvider
        refreshBenefits()
    }

    func getChips() -> Int {
        refreshBenefits()
        return rawChips()
    }

    func setChips(_ amount: Int) {
        userDefaults.set(max(0, amount), forKey: chipsKey)
    }

    func addChips(_ amount: Int) {
        refreshBenefits()
        setRawChips(rawChips() + amount)
    }

    func deductChips(_ amount: Int) -> Bool {
        refreshBenefits()
        let current = rawChips()
        if current >= amount {
            setRawChips(current - amount)
            return true
        }
        return false
    }

    func hasClaimedDailyFree() -> Bool {
        refreshBenefits()
        return userDefaults.bool(forKey: dailyFreeKey)
    }

    func markDailyFreeClaimed() {
        let calendar = Calendar.current
        let now = nowProvider()
        let todayStart = calendar.startOfDay(for: now)
        let todayTen = calendar.date(byAdding: .hour, value: 10, to: todayStart) ?? now
        userDefaults.set(todayTen, forKey: lastDailyFreeGrantAnchorKey)
        userDefaults.set(now >= todayTen, forKey: dailyFreeKey)
    }

    func hasSignedInToday() -> Bool {
        refreshBenefits()
        return userDefaults.bool(forKey: signInKey)
    }

    func markSignedIn() {
        userDefaults.set(true, forKey: signInKey)
    }

    func refreshBenefits() {
        let calendar = Calendar.current
        let now = nowProvider()
        let todayStart = calendar.startOfDay(for: now)
        let todayTen = calendar.date(byAdding: .hour, value: 10, to: todayStart) ?? now

        if let lastReset = userDefaults.object(forKey: lastResetKey) as? Date {
            if !calendar.isDate(lastReset, inSameDayAs: todayStart) {
                userDefaults.set(false, forKey: signInKey)
                userDefaults.set(todayStart, forKey: lastResetKey)
            }
        } else {
            userDefaults.set(todayStart, forKey: lastResetKey)
        }

        let lastGrantAnchor = userDefaults.object(forKey: lastDailyFreeGrantAnchorKey) as? Date
        let alreadyGrantedToday = lastGrantAnchor.map {
            calendar.isDate($0, equalTo: todayTen, toGranularity: .minute)
        } ?? false

        if now >= todayTen, !alreadyGrantedToday {
            setRawChips(rawChips() + GameConstants.dailyFreeChips)
            userDefaults.set(todayTen, forKey: lastDailyFreeGrantAnchorKey)
            userDefaults.set(true, forKey: dailyFreeKey)
        } else {
            userDefaults.set(now >= todayTen && alreadyGrantedToday, forKey: dailyFreeKey)
        }
    }

    private func rawChips() -> Int {
        userDefaults.integer(forKey: chipsKey)
    }

    private func setRawChips(_ amount: Int) {
        userDefaults.set(max(0, amount), forKey: chipsKey)
    }
}
