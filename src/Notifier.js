const axios = require('axios')
var Promise = require('bluebird');

const Nexmo = require('nexmo')

const {
    NEXMO_API_KEY,
    NEXMO_API_SECRET,
    NEXMO_APPLICATION_ID,
    NEXMO_APPLICATION_PRIVATE_KEY_PATH,
    FACEBOOK_PAGE_ID,
    APP_PHONE_NUMBER
  } = process.env;

const nexmo = new Nexmo({
  apiKey: NEXMO_API_KEY,
  apiSecret: NEXMO_API_SECRET,
  applicationId: NEXMO_APPLICATION_ID,
  privateKey: NEXMO_APPLICATION_PRIVATE_KEY_PATH
})

const dispatch = Promise.promisify(nexmo.dispatch.create, {context: nexmo.dispatch})

class Notifier {

    constructor() {
        this.results = []
    }

    async sendSubscriptionConfirmation(subscription) {
        const santaResponse = await this.getSantaHeading(subscription.coords.lat, subscription.coords.lng)

        console.log(santaResponse.data)

        const notificationText = `You've subscribed to Santa Delivery Notifications for the area of ${santaResponse.data.nearest.name}! You'll be notified as soon as Santa has delivered to this area 🎅🎁`

        this.sendNotification(subscription, notificationText)
    }

    async checkDeliveryNotification(subscription) {
        let checkResult = {sent: false, result: null}

        // Check location
        const santaResponse = await this.getSantaHeading(subscription.coords.lat, subscription.coords.lng)

        if(santaResponse.data.direction === 'away') {
            // Santa has now passed their location
            const notificationText = `Santa has delivered to you in ${santaResponse.data.nearest.name}! Which means your presents are now under your tree 🎄. His next stop is ${santaResponse.data.next.name} 🎅✨`
            checkResult.result = await this.sendNotification(subscription, notificationText)
            checkResult.sent = true;
        }
        
        return checkResult
    }

    async getSantaHeading(lat, lng) {
        try {
            return await axios.get(`https://wheres-santa.herokuapp.com/heading?lat=${lat}&lng=${lng}`)
        }
        catch(err) {
            console.error(err)
        }
    }

    async sendNotification(subscription, notificationText) {

        return await dispatch("failover", [
            {
                "from": { "type": "messenger", "id": FACEBOOK_PAGE_ID },
                "to": { "type": "messenger", "id": subscription.facebook_page_specific_id },
                "message": {
                    "content": {
                        "type": "text",
                        "text": notificationText
                 }
            },
            "failover":{
                "expiry_time": 600,
                "condition_status": "read"
            }
            },
                {
                "from": {"type": "sms", "number": APP_PHONE_NUMBER},
                "to": { "type": "sms", "number": subscription.tel},
                "message": {
                    "content": {
                    "type": "text",
                    "text": notificationText
                    }
                }
            }
        ])
    }

}

module.exports = Notifier