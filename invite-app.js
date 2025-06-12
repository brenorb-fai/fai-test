require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

const app = express();

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_ORG_NAME,
  GITHUB_ADMIN_TOKEN,
  SESSION_SECRET,
  BASE_URL
} = process.env;

if (
  !GITHUB_CLIENT_ID ||
  !GITHUB_CLIENT_SECRET ||
  !GITHUB_ORG_NAME ||
  !GITHUB_ADMIN_TOKEN ||
  !SESSION_SECRET ||
  !BASE_URL
) {
  throw new Error('Please set all environment variables in your .env file');
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/github/callback`
}, function(accessToken, refreshToken, profile, done) {
  return done(null, { username: profile.username, accessToken });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  async (req, res) => {
    // Invite the user to your org
    const org = GITHUB_ORG_NAME;
    const username = req.user.username;
    const token = GITHUB_ADMIN_TOKEN;

    try {
      await axios.post(
        `https://api.github.com/orgs/${org}/invitations`,
        { invitee_id: null, email: null, role: 'direct_member', team_ids: [] },
        {
          params: { invitee: username },
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github+json'
          }
        }
      );
      res.send(`<h2>Invitation sent!</h2><p>Check your GitHub email or notifications to accept the invite.</p>`);
    } catch (err) {
      res.send('<h2>Error inviting:</h2><pre>' + (err.response?.data?.message || err.message) + '</pre>');
    }
  }
);

app.get('/', (req, res) => {
  res.send('<a href="/auth/github"><button>Join my GitHub Organization</button></a>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));