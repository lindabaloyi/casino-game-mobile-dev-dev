/**
 * Build Lifecycle Tracker (JavaScript version for server)
 * Tracks the complete lifecycle of builds from creation to extension
 * Critical for debugging build identity and lifecycle issues
 */

class BuildLifecycleTracker {
  constructor() {
    this.createdBuilds = new Map();
    this.activeSessions = new Map();
    console.log('[BUILD_TRACKER] 🔧 Build Lifecycle Tracker initialized');
  }

  trackCreation(buildId, context, cards = [], metadata = {}) {
    const sessionId = this.getCurrentSession();
    const buildInfo = {
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

    console.log('[BUILD_TRACKER] 📝 Build CREATED:', {
      buildId,
      context,
      cardCount: cards.length,
      cards: cards.map(c => `${c.rank}${c.suit}`),
      sessionId,
      totalTrackedBuilds: this.createdBuilds.size,
      metadata
    });

    return buildInfo;
  }

  trackExtension(buildId, context, addedCard, metadata = {}) {
    const build = this.createdBuilds.get(buildId);

    if (build) {
      const extension = {
        timestamp: Date.now(),
        context,
        addedCard: `${addedCard.rank}${addedCard.suit}`,
        extensionCount: build.extensions.length + 1,
        metadata
      };

      build.extensions.push(extension);
      build.lastSeen = Date.now();

      console.log('[BUILD_TRACKER] 🔧 Build EXTENDED:', {
        buildId,
        context,
        addedCard: `${addedCard.rank}${addedCard.suit}`,
        totalExtensions: build.extensions.length,
        sessionConsistent: build.sessionId === this.getCurrentSession(),
        allExtensions: build.extensions.map(e => e.addedCard),
        metadata
      });

      return extension;
    } else {
      console.error('[BUILD_TRACKER] ⚠️ UNKNOWN BUILD EXTENSION ATTEMPT:', {
        buildId,
        context,
        addedCard: `${addedCard.rank}${addedCard.suit}`,
        knownBuilds: Array.from(this.createdBuilds.keys()),
        currentSession: this.getCurrentSession(),
        metadata
      });

      return null;
    }
  }

  getCurrentSession() {
    // Use timestamp-based session for now
    // In a real implementation, this could use game ID or user session
    return `session-${Date.now()}`;
  }

  getBuildSummary(buildId) {
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

  debugAllBuilds(gameState, context) {
    const builds = gameState.tableCards.filter((item) => item.type === 'build');
    console.log(`[ALL_BUILDS_FIXED:${context}]`, {
      totalBuilds: builds.length,
      timestamp: new Date().toISOString(),
      builds: builds.map((b, i) => ({
        index: i,
        id: b.buildId,
        owner: b.owner,
        // CRITICAL: Read directly from the UPDATED build in gameState
        cards: b.cards?.map((c) => `${c.rank}${c.suit}`) || [],
        cardCount: b.cards?.length || 0, // Should now show correct count!
        value: b.value || 0,               // Should now show updated value!
        lifecycle: this.createdBuilds.get(b.buildId) ? {
          createdAt: this.createdBuilds.get(b.buildId).createdAt,
          extensions: this.createdBuilds.get(b.buildId).extensions.length,
          sessionId: this.createdBuilds.get(b.buildId).sessionId
        } : 'NOT_TRACKED'
      }))
    });
  }

  // Critical diagnostic method
  diagnoseBuildFlow() {
    const summary = this.getAllBuildsSummary();
    const issues = [];

    summary.builds.forEach(build => {
      if (build.extensions.length === 0) {
        issues.push(`Build ${build.id} was created but never extended`);
      }
    });

    // Check for session consistency issues
    const sessionGroups = new Map();
    this.createdBuilds.forEach(build => {
      if (!sessionGroups.has(build.sessionId)) {
        sessionGroups.set(build.sessionId, []);
      }
      sessionGroups.get(build.sessionId).push(build);
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
    console.log('[BUILD_TRACKER] 🔄 Tracker reset');
  }
}

const buildTracker = new BuildLifecycleTracker();

module.exports = {
  BuildLifecycleTracker,
  buildTracker
};
