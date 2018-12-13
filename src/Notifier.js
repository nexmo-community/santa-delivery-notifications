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

    checkNotifications(users) {
        for(let uuid in users) {
            let user = users[uuid]
            console.log(user)
            
            this.checkNotification(user)
        }
    }

    checkNotification(user) {
        if(user.notificationSent !== true) {
            // Check location
            axios.get(`https://wheres-santa.herokuapp.com/heading?lat=${user.coords.lat}&lng=${user.coords.lng}`)
            .then((santaResponse) => {
                console.log('Santa')
                console.log(santaResponse.data)
                const data = santaResponse.data

                this.results.push(data)

                if(data.direction === 'away') {
                   this.sendNotification(user, data) 
                }
            })
            .catch(err => {
                console.error(err)
            })
        }
    }

    sendNotification(user, santaData) {
        // Santa has now passed their location
        const notificationText = `Santa has delivered to you in ${santaData.nearest.name}! Which means your presents are now under your tree 🎄. His next stop is ${santaData.next.name} 🎅✨`

        nexmo.dispatch.create("failover", [
            {
            "from": { "type": "messenger", "id": FACEBOOK_PAGE_ID },
            "to": { "type": "messenger", "id": user.facebookPageSpecificUserId },
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
                    user.notificationSent = true
                    console.log(result.dispatch_uuid)
                }
            }
        ])
    }

}

module.exports = Notifier