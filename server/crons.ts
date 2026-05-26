import cron from 'node-cron';
import getReport from './openAi';

export default function crons () {
    console.log('Starting crons...');

    cron.schedule('0 0 2 * *', () => {
        console.log('Runs on 2nd midnight every month...');
    });

    console.log('Crons started.');

}