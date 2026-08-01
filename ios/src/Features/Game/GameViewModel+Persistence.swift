import SwiftUI

extension GameViewModel {
    func syncArchiveForInProgressGame() {
        guard !gameState.players.isEmpty else {
            clearSavedGame()
            return
        }

        if showRoundEndModal || viewState == .roundEnd {
            saveGame(resumeMode: .nextHand)
        } else {
            saveGame(resumeMode: .currentHand)
        }
    }

    func prepareForExitFromToolbar() {
        analytics.log(AnalyticsEvent.exitFromGame, parameters: [
            AnalyticsParam.handNumber: gameState.handNumber,
            AnalyticsParam.chipCount: humanPlayer?.chips ?? 0,
            AnalyticsParam.street: gameState.currentStreet.displayName
        ])
        if showRoundEndModal || viewState == .roundEnd {
            saveGame(resumeMode: .nextHand)
        } else {
            saveGame(resumeMode: .currentHand)
        }
    }

    func saveGame(resumeMode: GameArchive.ResumeMode = .currentHand) {
        guard !gameState.players.isEmpty else {
            clearSavedGame()
            return
        }

        let archive = GameArchive(
            gameState: gameState,
            remainingDeck: remainingDeckSnapshot,
            savedAt: Date(),
            version: GameArchive.currentVersion,
            resumeMode: resumeMode
        )

        guard archive.isResumableFromMainMenu else {
            clearSavedGame()
            return
        }

        try? archiveManager.saveArchive(archive)
    }

    func clearSavedGame() {
        remainingDeckSnapshot = []
        archiveManager.clearArchive()
    }
}
