require('dotenv').load()

const path = require('path')

const koa = require('koa')
const koaRouter = require('koa-router')
const static = require('koa-static')
const render = require('koa-ejs')
const bodyParser = require('koa-bodyparser')
const session = require('koa-session')

const uuidv1 = require('uuid/v1')

const app = new koa()
const router = new koaRouter()

const Notifier = require('./src/Notifier')

const {
    KOA_APP_SECRET,
    FACEBOOK_APP_ID,
    FACEBOOK_HUB_CHALLENGE_VERIFY_TOKEN,
    NODE_ENV
  } = process.env

const DEV = (NODE_ENV === 'development')

app.keys = [KOA_APP_SECRET]

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
            facebook_page_specific_id: null
        }
    }
    else {
        console.log('user exists')
        console.log(getUser(ctx.session.sessionId))
    }

    return ctx.render('index', {
        user: getUser(ctx.session.sessionId),
        CONFIG: {FACEBOOK_APP_ID: FACEBOOK_APP_ID}
    })
})

// Allow for FB Webhook to be setup
router.get('/fb_subscribe', (ctx) => {
    if(ctx.request.query['hub.verify_token'] === FACEBOOK_HUB_CHALLENGE_VERIFY_TOKEN &&
    ctx.request.query['hub.challenge']) {
        ctx.response.body = ctx.request.query['hub.challenge']
    }

    ctx.status = 200
})

// Handle FB Messenger opt-in subscribe webhook
router.post('/fb_subscribe', (ctx) => {
    const messageContext = ctx.request.body.entry[0].messaging[0]
    const uuid = messageContext.optin.ref
    const fbPageSpecificUserId = messageContext.sender.id

    const user = getUser(uuid)
    user.facebook_page_specific_id = fbPageSpecificUserId

    const notifier = new Notifier()
    notifier.sendSubscriptionConfirmation(user)

    console.log('user updated via /fb_subscribe')
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

// Useful development/debug routes
router.get('/check_all_users', (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    const notifier = new Notifier()
    notifier.checkNotifications(users)

    ctx.status = 202
})

router.get('/users', (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    ctx.body = users
})

router.get('/kill_session', (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    ctx.session = null
    ctx.status = 204
})

app.use(router.routes())
  .use(router.allowedMethods())

const port = process.env.PORT || 1234
app.listen(port, () => console.log('server listening on port', port))