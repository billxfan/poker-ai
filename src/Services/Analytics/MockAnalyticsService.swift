import Foundation

final class MockAnalyticsService: IAnalyticsService {
    var events: [(event: String, parameters: [String: Any])] = []

    func log(_ event: String, parameters: [String: Any] = [:]) {
        events.append((event: event, parameters: parameters))
    }

    func setUserID(_ id: String?) {}

    func reset() {
        events.removeAll()
    }

    func lastEvent(_ event: String) -> [String: Any]? {
        events.last(where: { $0.event == event })?.parameters
    }

    func eventCount(_ event: String) -> Int {
        events.filter({ $0.event == event }).count
    }
}
