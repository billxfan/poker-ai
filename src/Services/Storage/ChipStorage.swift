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
        userDefaults.set(amount, forKey: key)
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
    private let chipsKey = "poker_ai_chips"
    private let dailyFreeKey = "poker_ai_daily_free"
    private let signInKey = "poker_ai_sign_in"
    private let lastResetKey = "poker_ai_last_reset"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        checkDailyReset()
    }

    func getChips() -> Int {
        return userDefaults.integer(forKey: chipsKey)
    }

    func setChips(_ amount: Int) {
        userDefaults.set(amount, forKey: chipsKey)
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

    func hasClaimedDailyFree() -> Bool {
        return userDefaults.bool(forKey: dailyFreeKey)
    }

    func markDailyFreeClaimed() {
        userDefaults.set(true, forKey: dailyFreeKey)
    }

    func hasSignedInToday() -> Bool {
        return userDefaults.bool(forKey: signInKey)
    }

    func markSignedIn() {
        userDefaults.set(true, forKey: signInKey)
    }

    private func checkDailyReset() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        if let lastReset = userDefaults.object(forKey: lastResetKey) as? Date {
            if !calendar.isDate(lastReset, inSameDayAs: today) {
                userDefaults.set(false, forKey: dailyFreeKey)
                userDefaults.set(false, forKey: signInKey)
                userDefaults.set(today, forKey: lastResetKey)
            }
        } else {
            userDefaults.set(today, forKey: lastResetKey)
        }
    }
}
