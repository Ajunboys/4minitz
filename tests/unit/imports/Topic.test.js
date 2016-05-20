/**
 * Created by felix on 16.05.16.
 */
import { expect } from 'chai';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

require('../../../lib/helpers');

let doNothing = () => {};

let dummyMinute = {
    _id: "AaBbCcDd",
    upsertTopic: doNothing
};

let Minutes = {
    findOne: () => dummyMinute
};

global.Random = {
    i: 1,
    id: function() {
        return this.i++;
    }
};

const {
        Topic
    } = proxyquire('../../../imports/topic', {
    './minutes': { Minutes, '@noCallThru': true}
});

describe('Topic', function() {

    let topicDoc;

    beforeEach(function () {

        topicDoc = {
            subject: "topic-subject",
            infoItems: []
        }
    });

    afterEach(function() {
    });

    describe('#constructor', function () {

        it('sets the reference to the parent minute correctly', function() {
            let myTopic = new Topic(dummyMinute._id, topicDoc);
            expect(myTopic._parentMinutes).to.equal(dummyMinute);
        });

        it('sets the subject correctly', function() {
            let myTopic = new Topic(dummyMinute._id, topicDoc);
            expect(myTopic._topicDoc.subject).to.equal(topicDoc.subject);
        });

        it('sets the initial value of the isOpen-flag correctly', function() {
            let myTopic = new Topic(dummyMinute._id, topicDoc);
            expect(myTopic._topicDoc.isOpen).to.be.true;
        });

        it('sets the initial value of the isNew-flag correctly', function() {
            let myTopic = new Topic(dummyMinute._id, topicDoc);
            expect(myTopic._topicDoc.isNew).to.be.true;
        });

    });

    it('#findTopicIndexInArray', function() {
        let topicArray = [ topicDoc ];
        let index = Topic.findTopicIndexInArray(topicDoc._id, topicArray);
        expect(index).to.equal(0);
    });

    describe('#hasOpenActionItem', function() {

        it('returns false if the topic does not have any sub items', function() {
            expect(Topic.hasOpenActionItem(topicDoc)).to.be.false;
        });

        it('returns false if the topic has only closed action items', function() {
            topicDoc.infoItems.push({
                isOpen: false
            });

            expect(Topic.hasOpenActionItem(topicDoc)).to.be.false;
        });

        it('returns true if the topic has a closed action item (static method call)', function() {
            topicDoc.infoItems.push({
                isOpen: false
            });
            topicDoc.infoItems[0].isOpen = true;
            expect(Topic.hasOpenActionItem(topicDoc)).to.be.true;
        });

        it('returns true if the topic has a closed action item (object method call)', function() {
            topicDoc.infoItems.push({
                isOpen: false
            });
            topicDoc.infoItems[0].isOpen = true;
            let myTopic = new Topic(dummyMinute._id, topicDoc);
            expect(myTopic.hasOpenActionItem()).to.be.true;
        });

    });

    it('#toggleState', function () {
        let myTopic = new Topic(dummyMinute._id, topicDoc);

        let oldState = myTopic._topicDoc.isOpen;

        myTopic.toggleState();

        // state should have changed
        expect(myTopic._topicDoc.isOpen).to.not.equal(oldState);

    });

    describe('#upsertInfoItem', function() {

        let myTopic, topicItemDoc;

        beforeEach(function() {
            myTopic = new Topic(dummyMinute._id, topicDoc);

            topicItemDoc = {
                subject: "info-item-subject",
                createdAt: new Date()
            };
        });

        it('adds a new info item to our topic', function() {
            myTopic.upsertInfoItem(topicItemDoc);

            expect(myTopic.getInfoItems().length, "the topic should have exactly one item").to.equal(1);
            expect(myTopic.getInfoItems()[0]._id, "the item should have an id").to.not.be.false;
            expect(myTopic.getInfoItems()[0].subject, "the subject should be set correctly").to.equal(topicItemDoc.subject);
        });

        it('updates an existing info item', function() {
            myTopic.upsertInfoItem(topicItemDoc);

            // Change the subject and call the upsertTopicItem method again
            let topicItem = myTopic.getInfoItems()[0];
            topicItem.subject = "new_subject";

            myTopic.upsertInfoItem(topicItem);

            expect(myTopic.getInfoItems().length, "the topic should have exactly one item").to.equal(1);
            expect(myTopic.getInfoItems()[0]._id, "the item should have an id").to.equal(topicItem._id);
            expect(myTopic.getInfoItems()[0].subject, "the subject should be set correctly").to.equal(topicItem.subject);
        });


    });

    it('#findInfoItem', function() {
        let myTopic = new Topic(dummyMinute._id, topicDoc);
        let infoItemDoc = {
            _id: 'AaBbCcDd01',
            subject: "info-item-subject",
            createdAt: new Date()
        };

        // new info item is not added yet, so our topic should not find it
        let foundItem = myTopic.findInfoItem(infoItemDoc._id);
        expect(foundItem).to.equal(undefined);

        // now we add the info item to our topic
        myTopic.upsertInfoItem(infoItemDoc);

        foundItem = myTopic.findInfoItem(infoItemDoc._id);
        // foundItem should not be undefined
        expect(foundItem, "the result should not be undefined").to.not.equal(undefined);
        // the subject of the found item should be equal to its initial value
        expect(foundItem._infoItemDoc.subject, "the correct info item should be found").to.equal(infoItemDoc.subject);
    });

    it('#removeInfoItem', function() {
        let myTopic = new Topic(dummyMinute._id, topicDoc);

        let infoItemDoc = {
            _id: 'AaBbCcDd01',
            subject: "info-item-subject",
            createdAt: new Date()
        };
        let infoItemDoc2 = {
            _id: 'AaBbCcDd02',
            subject: "info-item-subject2",
            createdAt: new Date()
        };

        // now we add the info items to our topic
        myTopic.upsertInfoItem(infoItemDoc);
        myTopic.upsertInfoItem(infoItemDoc2);

        // check that the two info items was added
        let initialLength = myTopic.getInfoItems().length;

        // remove the second one
        myTopic.removeInfoItem(infoItemDoc2._id);

        let diff = initialLength - myTopic.getInfoItems().length;

        // check that there are now only one items
        expect(diff, "The length of the info items should be decreased by one").to.equal(1);

        // check that the first item is still part of our topic
        expect(myTopic.getInfoItems()[0]._id, "The other info item should not be removed.").to.equal(infoItemDoc._id);

    });

    describe('#tailorTopic', function() {

        let myTopic;

        beforeEach(function() {
            topicDoc.infoItems.push({
                subject: "myInfoItem"
            });
            topicDoc.infoItems.push({
                subject: "myClosedActionItem",
                isOpen: false
            });
            topicDoc.infoItems.push({
                subject: "myOpenActionItem",
                isOpen: true
            });
            myTopic = new Topic(dummyMinute._id, topicDoc);
        });

        it('removes all info items and closed action items', function() {
            myTopic.tailorTopic();

            expect(myTopic.getInfoItems()).to.have.length(1);
        });

        it('keeps the open action items', function() {
            myTopic.tailorTopic();

            expect(myTopic._topicDoc.infoItems[0].isOpen).to.be.true;
        });

    });

    it('#save', function() {
        let myTopic = new Topic(dummyMinute._id, topicDoc);

        // the save-method should call the upsertTopic-Method of the parent Minute
        // so we spy on it
        var spy = sinon.spy(dummyMinute, "upsertTopic");

        myTopic.save();

        expect(spy.calledOnce, "the upsertTopic method should be called once").to.be.true;
        expect(spy.calledWith(myTopic._topicDoc), "the document should be sent to the upsertTopic method").to.be.true;

        spy.restore();
    });

    it('#getDocument', function () {
        let myTopic = new Topic(dummyMinute._id, topicDoc);

        expect(myTopic.getDocument()).to.equal(topicDoc);
    });

});