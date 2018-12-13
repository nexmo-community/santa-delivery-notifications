const axios = require('axios')

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

class Notifier {

    constructor() {
        this.results = []
    }

    async sendSubscriptionConfirmation(user) {
        const santaResponse = await this.getSantaHeading(user.coords.lat, user.coords.lng)

        console.log(santaResponse.data)

        const notificationText = `You've subscribed to Santa Delivery Notifications for the area of ${santaResponse.data.nearest.name}! You'll be notified as soon as Santa has delivered to this area 🎅🎁`

        this.sendNotification(user, notificationText)
    }

    checkNotifications(users) {
        for(let uuid in users) {
            let user = users[uuid]
            console.log(user)
            
            this.checkNotification(user)
        }
    }

    async checkNotification(user) {
        if(user.notificationSent !== true) {
            // Check location
            const santaResponse = await this.getSantaHeading(user.coords.lat, user.coords.lng).data

            this.results.push(santaResponse.data)

            if(data.direction === 'away') {
                // Santa has now passed their location
                const notificationText = `Santa has delivered to you in ${santaResponse.data.nearest.name}! Which means your presents are now under your tree 🎄. His next stop is ${santaResponse.data.next.name} 🎅✨`
                this.sendNotification(user, notificationText) 
            }
        }
    }

    async getSantaHeading(lat, lng) {
        try {
            return await axios.get(`https://wheres-santa.herokuapp.com/heading?lat=${lat}&lng=${lng}`)
        }
        catch(err) {
            console.error(err)
        }
    }

    sendNotification(user, notificationText) {

        nexmo.dispatch.create("failover", [
            {
                "from": { "type": "messenger", "id": FACEBOOK_PAGE_ID },
                "to": { "type": "messenger", "id": user.facebook_page_specific_id },
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
                "to": { "type": "sms", "number": user.tel},
                "message": {
                    "content": {
                    "type": "text",
                    "text": notificationText
                    }
                }
            },
            (err, result) => {
                if(err) {
                    console.error(err)
                }
                else {
                    console.log('Dispatch API called')
                    console.log(result)

                    user.notificationSent = true
                    console.log(result.dispatch_uuid)
                }
            }
        ])
    }

}

module.exports = Notifier