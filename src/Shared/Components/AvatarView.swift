import SwiftUI
import UIKit

struct AvatarView: View {
    let avatar: String
    var displayName: String? = nil
    var size: CGFloat = 28
    var backgroundColor: Color = Color.white.opacity(0.2)

    private var resolvedAvatarAssetName: String? {
        if UIImage(named: avatar) != nil {
            return avatar
        }

        if let displayName {
            switch displayName {
            case L10n.t("ai.old_k"): return "ai_old_k"
            case L10n.t("ai.pony"): return "ai_pony"
            case L10n.t("ai.uncle"): return "ai_uncle"
            case L10n.t("ai.fish"): return "ai_fish"
            case L10n.t("ai.fox"): return "ai_fox"
            default: break
            }
        }

        switch avatar {
        case "👴": return "ai_old_k"
        case "🧔": return "ai_uncle"
        case "👧": return "ai_fish"
        case "🦊": return "ai_fox"
        default: return nil
        }
    }

    private var hasImageAsset: Bool {
        resolvedAvatarAssetName != nil
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(backgroundColor)
                .frame(width: size, height: size)

            if let resolvedAvatarAssetName {
                Image(resolvedAvatarAssetName)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else {
                Text(avatar)
                    .font(.system(size: size * 0.58))
            }
        }
    }
}
