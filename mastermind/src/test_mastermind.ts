//@ts-ignore TS7016
import * as snarkjs from 'snarkjs'
//@ts-ignore TS7016
import * as compile from 'circom'
//@ts-ignore TS7016
import * as bigInt from 'big-integer'
//@ts-ignore TS7016
import {existsSync, readFileSync, writeFileSync} from 'fs'
//@ts-ignore TS7016
import * as crypto from 'crypto'

import {hash, numToCircomHashInput} from './hash'
import {genSolnInput} from './utils'

const testCases = [
    {
        "guess": [1, 2, 2, 1],
        "soln":  [2, 2, 1, 2],
        "whitePegs": 2,
        "blackPegs": 1,
    },
    {
        "guess": [1, 2, 2, 1],
        "soln":  [1, 2, 1, 2],
        "whitePegs": 2,
        "blackPegs": '2',
    },
    {
        "guess": [1, 3, 3, 3],
        "soln":  [3, 3, 3, 3],
        "whitePegs": 0,
        "blackPegs": 3,
    },
    {
        "guess": [2, 2, 1, 1],
        "soln":  [2, 2, 2, 2],
        "whitePegs": 0,
        "blackPegs": 2,
    },
    {
        "guess": [3, 1, 3, 4],
        "soln":  [4, 3, 2, 3],
        "whitePegs": 3,
        "blackPegs": 0,
    },
    {
        "guess": [1, 2, 3, 4],
        "soln":  [4, 3, 2, 1],
        "whitePegs": 4,
        "blackPegs": 0,
    },
    {
        "guess": [1, 1, 1, 1],
        "soln":  [4, 3, 2, 1],
        "whitePegs": 0,
        "blackPegs": 1,
    }
]


const genSalt = (): bigInt.BigInteger => {
    const buf = crypto.randomBytes(54)
    const salt = bigInt.fromArray(Array.from(buf), 256, false).minus(340)

    // 4 * (4^3) + 4 * (4^2) + 4 * (4^1) + 4 * (4^0) = 340
    // Only return values greater than the largest possible solution
    if (salt.lt(340)) {
        return genSalt()
    }

    return salt
}

const main = async function() {
    const circuitDef = JSON.parse(
        readFileSync('mastermind/circuits/mastermind.json', 'utf8')
    )

    const circuit = new snarkjs.Circuit(circuitDef);
    testCases.forEach(testCase => {
        const salt: bigInt.BigInteger = genSalt()
        const saltedSoln = genSolnInput(testCase.soln).add(salt)
        const {a, b} = numToCircomHashInput(saltedSoln)

        // it doesn't work if you pass in a bigInt
        const hashedSaltedSoln = hash(saltedSoln).toString()

        const testInput = {
            pubNumBlacks: testCase.blackPegs.toString(),
            pubNumWhites: testCase.whitePegs.toString(),
            pubSolnHash: hashedSaltedSoln,
            pubSalt: salt.toString(),
            pubSaltedSolnA: a.toString(),
            pubSaltedSolnB: b.toString(),
            pubGuessA: testCase.guess[0],
            pubGuessB: testCase.guess[1],
            pubGuessC: testCase.guess[2],
            pubGuessD: testCase.guess[3],
            privSolnA: testCase.soln[0],
            privSolnB: testCase.soln[1],
            privSolnC: testCase.soln[2],
            privSolnD: testCase.soln[3],
        }

        const witness = circuit.calculateWitness(testInput)
        console.log('Hash calculated by JS     :', testInput.pubSolnHash)
        console.log('Hash calculated by circuit:', witness[circuit.getSignalIdx('main.solnHashOut')])
    })
}

main()
