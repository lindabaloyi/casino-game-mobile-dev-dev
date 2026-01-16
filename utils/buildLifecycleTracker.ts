/**
 * Build Lifecycle Tracker
 * Tracks the complete lifecycle of builds from creation to extension
 * Critical for debugging build identity and lifecycle issues
 */

export interface BuildInfo {
  buildId: string;
  createdAt: number;
  context: string;
  sessionId: string;
  cards: string[];
  extensions: ExtensionInfo[];
  metadata: any;
  lastSeen: number;
}

export interface ExtensionInfo {
  timestamp: number;
  context: string;
  addedCard: string;
  extensionCount: number;
  metadata?: any;
}

export class BuildLifecycleTracker {
  private createdBuilds: Map<string, BuildInfo> = new Map();
  private activeSessions: Map<string, string> = new Map();

  trackCreation(buildId: string, context: string, cards: any[] = [], metadata: any = {}): BuildInfo {
    const sessionId = this.getCurrentSession();
    const buildInfo: BuildInfo = {
      buildId,
      createdAt: Date.now(),
      context,
      sessionId,
      cards: cards.map(c => `${c.rank}${c.suit}`),
      extensions: [],
      metadata,
      lastSeen: Date.now()
    };

    this.createdBuilds.set(buildId, buildInfo);

    return buildInfo;
  }

  trackExtension(buildId: string, context: string, addedCard: any, metadata: any = {}): ExtensionInfo | null {
    const build = this.createdBuilds.get(buildId);

    if (build) {
      const extension: ExtensionInfo = {
        timestamp: Date.now(),
        context,
        addedCard: `${addedCard.rank}${addedCard.suit}`,
        extensionCount: build.extensions.length + 1,
        metadata
      };

      build.extensions.push(extension);
      build.lastSeen = Date.now();

      return extension;
    } else {
      return null;
    }
  }

  getCurrentSession(): string {
    // Use timestamp-based session for now
    // In a real implementation, this could use game ID or user session
    return `session-${Date.now()}`;
  }

  getBuildSummary(buildId: string): BuildInfo | undefined {
    return this.createdBuilds.get(buildId);
  }

  getAllBuildsSummary() {
    return {
      totalBuilds: this.createdBuilds.size,
      builds: Array.from(this.createdBuilds.entries()).map(([id, data]) => ({
        id,
        created: data.context,
        cards: data.cards,
        extensions: data.extensions.length,
        lastExtension: data.extensions[data.extensions.length - 1]?.addedCard,
        sessionId: data.sessionId,
        lastSeen: new Date(data.lastSeen).toISOString()
      }))
    };
  }

  debugAllBuilds(gameState: any, context: string) {
    const builds = gameState.tableCards.filter((item: any) => item.type === 'build');
  }

  // Critical diagnostic method
  diagnoseBuildFlow() {
    const summary = this.getAllBuildsSummary();
    const issues: string[] = [];

    summary.builds.forEach(build => {
      if (build.extensions === 0) {
        issues.push(`Build ${build.id} was created but never extended`);
      }
    });

    // Check for session consistency issues
    const sessionGroups = new Map<string, BuildInfo[]>();
    this.createdBuilds.forEach(build => {
      if (!sessionGroups.has(build.sessionId)) {
        sessionGroups.set(build.sessionId, []);
      }
      sessionGroups.get(build.sessionId)!.push(build);
    });

    sessionGroups.forEach((builds, sessionId) => {
      if (builds.length > 3) {
        issues.push(`Session ${sessionId} has ${builds.length} builds - potential memory leak`);
      }
    });

    return {
      summary,
      issues,
      recommendations: issues.length > 0
        ? ['Check build ID consistency', 'Verify UI build selection', 'Test state synchronization', 'Monitor for memory leaks']
        : ['Build flow appears healthy']
    };
  }

  // Reset tracker (useful for testing)
  reset() {
    this.createdBuilds.clear();
    this.activeSessions.clear();
  }
}

export const buildTracker = new BuildLifecycleTracker();
