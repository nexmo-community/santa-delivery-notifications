require('dotenv').load()

const path = require('path')

const koa = require('koa')
const koaRouter = require('koa-router')
const static = require('koa-static')
const render = require('koa-ejs');
const bodyParser = require('koa-bodyparser')
const session = require('koa-session');

const uuidv1 = require('uuid/v1');

const Nexmo = require('nexmo')

const nexmo = new Nexmo({
  apiKey: process.env.NEXMO_API_KEY,
  apiSecret: process.env.NEXMO_API_SECRET,
  applicationId: process.env.NEXMO_APPLICATION_ID,
  privateKey: process.env.NEXMO_APPLICATION_PRIVATE_KEY_PATH
})

const app = new koa()
const router = new koaRouter()

app.keys = [process.env.KOA_APP_SECRET];

const users = {}

function getUser(uuid) {
    return users[uuid]
}

app.use(session(app))
app.use(static('public/'))
app.use(bodyParser())

render(app, {
    root: path.join(__dirname, 'views'),
    viewExt: 'html',
    layout: false,
    cache: false,
    debug: false
});

router.get('/', (ctx) => {
    if (getUser(ctx.session.sessionId) === undefined) {
        const userUUID = uuidv1() 
        ctx.session.sessionId = userUUID

        users[userUUID] = {
            uuid: userUUID,
            coords: {},
            tel: null,
            facebookPageSpecificUserId: null
        }
    }
    else {
        console.log('user exists')
        console.log(getUser(ctx.session.sessionId))
    }

    return ctx.render('index', {
        user: getUser(ctx.session.sessionId),
        CONFIG: {FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID}
    })
})

router.get('/users', (ctx) => {
    ctx.body = users
})

router.get('/kill_session', (ctx) => {
    ctx.session = null
    ctx.status = 204
})

// Allow for FB Webhook to be setup
router.get('/fb_inbound', (ctx) => {
    if(ctx.request.query['hub.challenge']) {
        ctx.response.body = ctx.request.query['hub.challenge']
    }

    ctx.status = 200
})

// Handle FB Messenger subscribe
router.post('/fb_inbound', (ctx) => {
    const messageContext = ctx.request.body.entry[0].messaging[0]
    const uuid = messageContext.optin.ref
    const fbPageSpecificUserId = messageContext.sender.id

    const user = getUser(uuid)
    user.facebookPageSpecificUserId = fbPageSpecificUserId

    console.log('user updated via /fb_inbound')
    console.log(user)

    ctx.status = 201
})

// Get user data following Messenger subscribe
router.post('/user_data', (ctx) => {
    const user = getUser(ctx.session.sessionId)
    user.coords = ctx.request.body.coords
    user.tel = ctx.request.body.tel

    console.log('user updated via /user_data')
    console.log(user)

    ctx.status = 200
})

// Nexmo routes
router.post('/status', (ctx) => {
    console.log('/status')
    console.log(ctx.request.body)
    ctx.status = 200
})

router.post('/inbound', (ctx) => {
    console.log('/inbound')

    console.log(ctx.request.body)
    ctx.status = 200
})

app.use(router.routes())
  .use(router.allowedMethods())

function checkNotificationSubscriptionData(ctx) {
    console.log('userData')
    console.log(ctx.session.userData)

    console.log('fbData')
    console.log(ctx.session.fbData)
}

const port = process.env.PORT || 1234
app.listen(port, () => console.log('server listening on port', port))