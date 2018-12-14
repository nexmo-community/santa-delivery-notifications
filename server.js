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
const SubscriptionStore = require('./src/SubscriptionStore')

const {
    KOA_APP_SECRET,
    FACEBOOK_APP_ID,
    FACEBOOK_HUB_CHALLENGE_VERIFY_TOKEN,
    NODE_ENV
  } = process.env

const DEV = (NODE_ENV === 'development')

app.keys = [KOA_APP_SECRET]

const subscriptionStore = new SubscriptionStore()

// Session users until we get all the information required
// for a Santa Delivery Notification
const sessionUsers = {}

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
    if (sessionUsers[ctx.session.sessionId] === undefined) {
        const userUUID = uuidv1() 
        ctx.session.sessionId = userUUID

        sessionUsers[userUUID] = {
            uuid: userUUID,
            coords: {},
            tel: null,
            facebook_page_specific_id: null
        }
    }
    else {
        console.log('user exists')
        console.log(sessionUsers[ctx.session.sessionId])
    }

    return ctx.render('index', {
        user: sessionUsers[ctx.session.sessionId],
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
router.post('/fb_subscribe', async (ctx) => {
    const messageContext = ctx.request.body.entry[0].messaging[0]
    const uuid = messageContext.optin.ref
    const fbPageSpecificUserId = messageContext.sender.id

    const sessionUser = sessionUsers[uuid]
    sessionUser.facebook_page_specific_id = fbPageSpecificUserId

    let httpStatus = null
    let subscriptionResult = null
    try {
        subscriptionResult = await subscriptionStore.addSubscription(sessionUser)
    }
    catch(error) {
        console.error(error)
    }

    if(subscriptionResult._id) {
        const notifier = new Notifier()
        notifier.sendSubscriptionConfirmation(subscriptionResult)
    }

    console.log('/fb_subscribe result')
    console.log(subscriptionResult)

    // Always return 200 to Facebook
    ctx.status = 200
})

// Get user data following Messenger subscribe
router.post('/user_data', (ctx) => {
    const sessionUser = sessionUsers[ctx.session.sessionId]
    sessionUser.coords = ctx.request.body.coords
    sessionUser.tel = ctx.request.body.tel

    console.log('sessionUser updated via /user_data')
    console.log(sessionUser)

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
router.get('/check_all_subscriptions', async (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }

    const subscriptions = await subscriptionStore.getPendingNotifications()

    console.log(subscriptions)

    const notifier = new Notifier()
    subscriptions.forEach(async subscription => {
        console.log(subscription)
        
        const checkResult = await notifier.checkDeliveryNotification(subscription)
        if(checkResult.sent) {
            subscription.notification_sent = true
            // update store
            subscriptionStore.updateSubscription(subscription)
        }

    })

    ctx.status = 202
})

router.get('/subscriptions', async (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    ctx.body = await subscriptionStore.getNotifications()
})

router.get('/pending_subscriptions', async (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    ctx.body = await subscriptionStore.getPendingNotifications()
})

router.get('/session_users', (ctx) => {
    if(!DEV) {
        ctx.status = 401
        return
    }
    ctx.body = sessionUsers
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