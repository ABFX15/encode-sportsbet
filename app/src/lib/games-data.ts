// Mock games data - in production, fetch from an API
export const UPCOMING_GAMES = [
    {
        id: 'nba_lal_gsw_2024',
        sport: 'NBA',
        teamA: 'LA Lakers',
        teamB: 'Golden State Warriors',
        startTime: Date.now() + 3600000 * 24, // Tomorrow
        odds: { teamA: 2.1, teamB: 1.8, draw: null }
    },
    {
        id: 'nfl_dal_phi_2024',
        sport: 'NFL',
        teamA: 'Dallas Cowboys',
        teamB: 'Philadelphia Eagles',
        startTime: Date.now() + 3600000 * 48, // 2 days
        odds: { teamA: 1.9, teamB: 2.0, draw: null }
    },
    {
        id: 'epl_mci_ars_2024',
        sport: 'EPL',
        teamA: 'Manchester City',
        teamB: 'Arsenal',
        startTime: Date.now() + 3600000 * 72, // 3 days
        odds: { teamA: 1.7, teamB: 3.2, draw: 2.8 }
    }
];
