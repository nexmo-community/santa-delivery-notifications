const {
    MLAB_USERNAME,
    MLAB_PASSWORD,
    MLAB_URI,
    MLAB_DB_NAME
  } = process.env;

  
const mongoose = require('mongoose');

class SubscriptionStore {
    constructor() {
        mongoose
            .connect(`mongodb://${MLAB_USERNAME}:${MLAB_PASSWORD}@${MLAB_URI}/${MLAB_DB_NAME}`,
                { useNewUrlParser: true }
            )
            .then(console.log('MongoDB Connected...'))
            .catch(err => console.log(err))

        this.SubscriptionModel = mongoose.model('Subscription', {
            uuid: String,
            coords: {
                lat: String,
                lng: String
            },
            tel: {type: String, unique: true},
            facebook_page_specific_id: {type: String, unique: true},
            subscribed: {type: Boolean, default: false},
            notification_sent: {type: Boolean, default: false}
        })

    }

    async addSubscription(user) {
        const subscription = new this.SubscriptionModel(user)
        const result = await subscription.save()
        console.log('saving subscription')
        console.log(result)
        return result
    }

    async getPendingNotifications() {
        return await this.SubscriptionModel.find({notification_sent: false})
    }

    async getNotifications() {
        return await this.SubscriptionModel.find({})
    }

    async updateSubscription(subscription) {
        const updateResult = await this.SubscriptionModel.update({uuid: subscription.uuid}, subscription)
        console.log(updateResult)

        return updateResult
    }
}

module.exports = SubscriptionStore
