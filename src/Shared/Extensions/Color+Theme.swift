import SwiftUI

extension Color {
    // MARK: - Primary Colors
    static let primary = Color(hex: "1E3A5F")
    static let secondary = Color(hex: "2563EB")
    static let accent = Color(hex: "7C3AED")
    static let welfare = Color(hex: "DC2626")
    static let statistics = Color(hex: "64748B")

    // MARK: - Table Colors
    static let tableGreen = Color(hex: "0D5C3F")
    static let tableFelt = Color(hex: "0A4A31")
    static let chipGold = Color(hex: "D4AF37")
    static let chipSilver = Color(hex: "C0C0C0")

    // MARK: - Status Colors
    static let success = Color(hex: "2E7D32")
    static let warning = Color(hex: "F59E0B")
    static let error = Color(hex: "EF4444")
    static let folded = Color(hex: "6B7280")

    // MARK: - Button Colors
    static let foldButton = Color(hex: "EF4444")
    static let callButton = Color(hex: "10B981")
    static let raiseButton = Color(hex: "F59E0B")
    static let allInButton = Color(hex: "EA580C")
    static let disabled = Color(hex: "9CA3AF")

    // MARK: - Text Colors
    static let textPrimary = Color(hex: "1F2937")
    static let textSecondary = Color(hex: "6B7280")
    static let textOnDark = Color.white
    static let textGold = Color(hex: "D4AF37")

    // MARK: - Background Colors
    static let background = Color(hex: "F3F4F6")
    static let cardBackground = Color.white
    static let modalOverlay = Color.black.opacity(0.5)

    // MARK: - Initializer
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
