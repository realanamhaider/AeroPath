function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getLocalDateString(date = new Date()) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysUntil(dateString) {
  if (!dateString) {
    return null;
  }

  const target =
    new Date(
      `${dateString}T23:59:59`
    );

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  const now =
    new Date();

  const difference =
    target.getTime() -
    now.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

export function buildNotifications({
  missions = [],
  opportunities = [],
  roadmap = null,
}) {
  const notifications = [];

  const today =
    getLocalDateString();

  /* =========================================
     OVERDUE MISSIONS
  ========================================= */

  const overdueMissions =
    missions
      .filter(
        (mission) =>
          mission.completed !==
            true &&
          mission.dueDate &&
          mission.dueDate <
            today
      )
      .sort((a, b) =>
        a.dueDate.localeCompare(
          b.dueDate
        )
      );

  if (
    overdueMissions.length > 0
  ) {
    const first =
      overdueMissions[0];

    notifications.push({
      id: "missions-overdue",

      type: "mission",

      severity: "critical",

      title:
        overdueMissions.length === 1
          ? "Mission overdue"
          : `${overdueMissions.length} missions overdue`,

      message:
        overdueMissions.length === 1
          ? `"${first.title}" is past its due date.`
          : `"${first.title}" is the oldest overdue mission.`,

      actionLabel:
        "Review overdue",

      filter:
        "overdue",
    });
  }

  /* =========================================
     MISSIONS DUE TODAY
  ========================================= */

  const dueToday =
    missions.filter(
      (mission) =>
        mission.completed !==
          true &&
        mission.dueDate ===
          today
    );

  if (dueToday.length > 0) {
    notifications.push({
      id: "missions-today",

      type: "mission",

      severity: "high",

      title:
        dueToday.length === 1
          ? "Mission due today"
          : `${dueToday.length} missions due today`,

      message:
        dueToday.length === 1
          ? `"${dueToday[0].title}" is due today.`
          : "Your Flight Plan has work due before the day ends.",

      actionLabel:
        "Open Flight Plan",

      filter:
        "today",
    });
  }

  /* =========================================
     OPPORTUNITY DEADLINES
  ========================================= */

  const closingOpportunities =
    opportunities
      .filter(
        (opportunity) => {
          if (
            opportunity.dismissed ||
            opportunity.status ===
              "rejected" ||
            !opportunity.deadline
          ) {
            return false;
          }

          const remaining =
            daysUntil(
              opportunity.deadline
            );

          return (
            remaining !== null &&
            remaining >= 0 &&
            remaining <= 7
          );
        }
      )
      .sort((a, b) =>
        a.deadline.localeCompare(
          b.deadline
        )
      );

  if (
    closingOpportunities.length >
    0
  ) {
    const closest =
      closingOpportunities[0];

    const remaining =
      daysUntil(
        closest.deadline
      );

    notifications.push({
      id: `deadline-${closest.id}`,

      type: "opportunity",

      severity:
        remaining <= 2
          ? "critical"
          : "high",

      title:
        remaining === 0
          ? "Opportunity closes today"
          : remaining === 1
            ? "Opportunity closes tomorrow"
            : `Opportunity closes in ${remaining} days`,

      message:
        `${closest.title} at ${
          closest.company ||
          "this company"
        } has an approaching deadline.`,

      actionLabel:
        "Review opportunity",

      route:
        "/internships",
    });
  }

  /* =========================================
     STRONG OPPORTUNITY MATCH
  ========================================= */

  const strongestOpportunity =
    [...opportunities]
      .filter(
        (opportunity) =>
          !opportunity.dismissed &&
          opportunity.status !==
            "rejected" &&
          (opportunity.matchScore ||
            0) >= 80
      )
      .sort(
        (a, b) =>
          (b.matchScore || 0) -
          (a.matchScore || 0)
      )[0];

  if (strongestOpportunity) {
    notifications.push({
      id: `strong-${strongestOpportunity.id}`,

      type: "opportunity",

      severity: "medium",

      title: `${strongestOpportunity.matchScore}% opportunity match`,

      message:
        `${strongestOpportunity.title} at ${
          strongestOpportunity.company ||
          "this company"
        } is currently one of your strongest matches.`,

      actionLabel:
        "Open Radar",

      route:
        "/internships",
    });
  }

  /* =========================================
     ROADMAP ACTION WAITING
  ========================================= */

  const roadmapActions =
    Array.isArray(
      roadmap?.nextActions
    )
      ? roadmap.nextActions
      : [];

  const roadmapMissionTitles =
    new Set(
      missions
        .filter(
          (mission) =>
            mission.source ===
              "roadmap" &&
            mission.roadmapAction
        )
        .map((mission) =>
          normalizeText(
            mission.roadmapAction
          )
        )
    );

  const waitingAction =
    roadmapActions.find(
      (action) =>
        !roadmapMissionTitles.has(
          normalizeText(
            action.title
          )
        )
    );

  if (waitingAction) {
    notifications.push({
      id: `roadmap-${normalizeText(
        waitingAction.title
      )}`,

      type: "roadmap",

      severity: "low",

      title:
        "Roadmap action waiting",

      message:
        `"${waitingAction.title}" has not been added to your Flight Plan yet.`,

      actionLabel:
        "View Roadmap",

      route:
        "/roadmap",
    });
  }

  /* =========================================
     PRIORITY SORT
  ========================================= */

  const severityRank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return notifications.sort(
    (a, b) =>
      severityRank[
        b.severity
      ] -
      severityRank[
        a.severity
      ]
  );
}