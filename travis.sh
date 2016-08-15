
TEST="$1"

if [ "$TEST" = "unit" ]; then
    echo Run unit and integration teststr
    npm run test:unit
    UNIT=$?
    npm run test:integration:headless
    INT=$?
    exit $(($UNIT + $INT))
fi

echo Run end2end tests: "$TEST"

echo Remove old log file
rm server.log

echo Start end2end server
npm run test:end2end:server > server.log&

COUNTER=0
MAX_WAIT=900
until grep "=> App running at" server.log; do
    echo App has not started yet.. Waiting for $COUNTER seconds
    sleep 30
    COUNTER=$(($COUNTER+30))

    if [ $COUNTER -gt $MAX_WAIT ]; then
        echo Meteor takes too long to start, exiting. Server log:
        cat server.log
        exit 1
    fi
done

sleep 10

echo Start end2end test runner
chimp --ddp=http://localhost:3100 --mocha --path=tests/end2end --browser=phantomjs -- $TEST tests/end2end/setup.js

CHIMP_RESULT=$?

echo Server log:
cat server.log
rm server.log

mkdir -p ./tests/mongodump
# mongodump does not work, system mongodb and meteor mongodb versions do not match
#mongodump -h localhost:3101 -d meteor -vvv -o ./tests/mongodump
# use mongoexport instead; feel free to add more collections
for collection in "meetingSeries" "minutes"; do
    mongoexport -h localhost:3101 -d meteor -c $collection -o tests/mongodump/$collection.js
done

exit $CHIMP_RESULT
