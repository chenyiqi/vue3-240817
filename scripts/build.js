import {execa} from 'execa';
import { targets as allTargets, fuzzyMatchTarget } from './utils.js';
import minimist from 'minimist'
const args = minimist(process.argv.slice(2));
const targets = args._;
const formats = args.formats || args.f;
const buildAllMatching = args.all || args.a;

run();
async function run() {
    if (!targets.length) {
        await buildAll(allTargets);
    } else {
        await buildAll(fuzzyMatchTarget(targets, buildAllMatching));
    }
}

async function buildAll(targets) {
    for (const target of targets) {
        await build(target);
    }
}

async function build(target) {
    const env = 'development';
    await execa(
        'rollup',
        [
            '-c',
            '--environment',
            [
                `NODE_ENV:${env}`,
                `TARGET:${target}`,
                formats ? `FORMATS:${formats}` : ``,
                // buildTypes ? `TYPES:true` : ``,
                // prodOnly ? `PROD_ONLY:true` : ``,
                // lean ? `LEAN:true` : ``
            ]
            .filter(Boolean)
            .join(',')
        ],
        { stdio: 'inherit' }
    )
}