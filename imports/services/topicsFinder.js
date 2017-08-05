import { TopicSchema } from '/imports/collections/topic.schema';

export class TopicsFinder {

    static allTopicsOfMeetingSeries(meetingSeriesId) {
        return TopicSchema.getCollection().find({ parentId: meetingSeriesId }).fetch();
    }

    static allOpenTopicsOfMeetingSeries(meetingSeriesId) {
        return TopicSchema.getCollection().find({ parentId: meetingSeriesId, isOpen: true }).fetch();
    }

}