const helper = require('../modules/helper')
const sound = require('./sound')

// state for gameclock props
let adjustAction,
    adjustEventID,
    adjustPlayerID,
    adjustVal,
    clockMode,
    initialTime,
    mode,
    numMoves

// helpers for App rendering gameclock
let handleEventCallback,
    handleNeedsUpdate,
    handleResizeClock

// state for App and clock
let clockEnabled,
    initialTimeChanged,
    lastActivePlayers,
    lastClock,
    lastClockOnMove,
    lastMode,
    playStarted,
    showClocks,
    unknownLastMoveTime

// helpers for adjustPlayerClock & handleAdjust callback
let adjustPromise,
    adjustPromiseReject,
    adjustPromiseResolve

// helper functions used by App to interact with and modify the gameclock

exports.adjustPlayerClock = async function(sign = null, action = null, val = null) {
    // validate first before setting clock state
    if (sign == null || action == null || val == null) return

    let playerID = sign > 0 ? 'b' : (sign < 0 ? 'w' : null)
    if (playerID == null) return

    if (adjustEventID == null) {
        adjustEventID = 0
    } else {
        adjustEventID++
    }
    adjustAction = action
    adjustPlayerID = playerID
    adjustVal = val
    adjustPromise = new Promise(function(resolve, reject) {
      adjustPromiseResolve = resolve;
      adjustPromiseReject = reject;
    });
    await (forceUpdate())
    return adjustPromise
}

exports.init = function() {
    numMoves = 0
    mode = 'init'
    lastClock = null
    lastClockOnMove = null

    adjustAction = null
    adjustEventID = null
    adjustPlayerID = null
    adjustVal = null

    validateClockSettings()
    forceUpdate()
}

exports.makeMove = function() {
    if (mode == null || mode === 'init' || mode === 'reset') {
        validateClockSettings()
    }
    if (numMoves != null) {
        numMoves++
    }
    forceUpdate()
}

exports.pause = async function() {
    if (!clockEnabled) return
    mode = 'pause'
    // for end of game on time let countdown finish
    sound.stopTimeCountDown(2)
    await (forceUpdate())
}

exports.pauseLast = async function() {
    lastMode = mode
    await (exports.pause())
}

exports.reset = function() {
    numMoves = 0
    mode = 'reset'
    lastClock = null
    lastClockOnMove = null

    adjustAction = null
    adjustEventID = null
    adjustPlayerID = null
    adjustVal = null

    validateClockSettings()
    forceUpdate()
}

exports.resume = async function() {
    if (!clockEnabled) return
    if (mode == null || mode === 'init' || mode === 'reset') {
        await (validateClockSettings())
    }
    mode = 'resume'
    await (forceUpdate())
}

exports.resumeLast = async function() {
    if (lastMode === 'resume') {
        lastMode = mode
        await (exports.resume())
    }
}

exports.resumeOnPlayStarted = async function() {
    if (playStarted) {
        playStarted = false
        await (exports.resume())
    }
}

exports.setClockModeAbsolute = function() {
    clockMode = 'absolutePerPlayer'
}

exports.setClockModeByoYomi = function() {
    clockMode = 'byo-yomi'
}

exports.setInitialTime = function(o = {}) {
    let playerIndex = (o.sign != null && o.sign > 0) ? 0 :
        (o.sign != null && o.sign < 0) ? 1
        : null

    if (playerIndex == null) return

    if (initialTime == null || initialTime.length !== 2) {
        initialTime = [null, null]
    }

    let playerID = o.sign === 1 ? 'b' : 'w'
    let playerText = null
    let mainTime = o.mainTime != null && o.mainTime > 0 ? o.mainTime : 0
    let mainMoves = 0
    let periodTime = o.periodTime != null && o.periodTime > 0 ?
        o.periodTime : 0
    let numPeriods = periodTime > 0 &&
        o.numPeriods != null && o.numPeriods > 0 ? o.numPeriods : 0
    let periodMoves = periodTime > 0 &&
        o.periodMoves != null && o.periodMoves > 0 ? o.periodMoves : 0

    if (mainTime > 0 ||
        (numPeriods >= 1 && periodMoves >= 1 && periodTime > 0)) {

        let initTime = {
            mainTime,
            mainMoves,
            numPeriods,
            periodMoves,
            periodTime,
            playerID,
            playerText
        }
        if (!helper.equals(initTime, initialTime[playerIndex])) {
            initialTime[playerIndex] = initTime
            exports.setInitialTimeChanged(true)
        }
    } else {
        initialTime[playerIndex] = null
        exports.setInitialTimeChanged(true)
    }
}

exports.setInitialTimeNull = function() {
    if (initialTime != null) {
        initialTime[0] = null
        initialTime[1] = null
    }
    initialTime = null
    exports.setInitialTimeChanged(true)
}

exports.setPlayerClockTime = async function({sign = null, elapsedTime = null} = {}) {
    if (sign == null || elapsedTime == null) return

    let {
        elapsedMainTime: mainTime,
        elapsedNumPeriods: numPeriods,
        elapsedPeriodMoves: periodMoves,
        elapsedPeriodTime: periodTime,
        elapsedMoveTime: moveTime,
        elapsedTotalTime: totalTime
    } = elapsedTime

    await (exports.adjustPlayerClock(sign, 'setElapsedMainTime', mainTime))
    await (exports.adjustPlayerClock(sign, 'setElapsedNumPeriods', numPeriods))
    await (exports.adjustPlayerClock(sign, 'setElapsedPeriodMoves', periodMoves))
    await (exports.adjustPlayerClock(sign, 'setElapsedPeriodTime', periodTime))
    await (exports.adjustPlayerClock(sign, 'setElapsedMoveTime', moveTime))
    await (exports.adjustPlayerClock(sign, 'setElapsedTotalTime', totalTime))
}

// helpers used to sync the gameclock with App

exports.changeToPlayer = function(sign = null, {resumeAfter = false} = {}) {
    if (sign != null && lastActivePlayers != null &&
        lastActivePlayers.length > 0) {

        let nextPlayerID = sign > 0 ? 'b' : (sign < 0 ? 'w' : null)
        if (nextPlayerID != null) {
            let playerID = lastActivePlayers[0]
            if (playerID != null) {
                if (playerID !== nextPlayerID) {
                    if (resumeAfter) exports.pauseLast()
                    exports.makeMove()
                    if (resumeAfter) exports.resumeLast()
                }
            }
        }
    }
}

exports.resetLastElapsedMoveTime = async function(sign = null) {
    if (sign == null) return
    await (exports.adjustPlayerClock(sign, 'setElapsedMoveTime', 0))
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex == null) return
    if (lastClock != null && lastClock[playerIndex] != null)
        lastClock[playerIndex].elapsedMoveTime = 0
    if (lastClockOnMove != null && lastClockOnMove[playerIndex] != null)
        lastClockOnMove[playerIndex].elapsedMoveTime = 0
}

// helper functions used exclusively by PlayBar

// collects the props for gameclock
exports.getProps = function() {
    let hasPeriodTime = (
        clockMode === 'byo-yomi' &&
        initialTime != null &&
        initialTime.length == 2 && (
            (initialTime[0].periodTime > 0) ||
            (initialTime[1].periodTime > 0)
        ))
    let hasMultiplePeriods = (
        hasPeriodTime && (
            (initialTime[0].numPeriods > 1 && initialTime[0].periodTime > 0) ||
            (initialTime[1].numPeriods > 1 && initialTime[1].periodTime > 0)
        ))
    let hasMultiplePeriodMoves = (
        hasPeriodTime && (
            (initialTime[0].periodMoves > 1 && initialTime[0].periodTime > 0) ||
            (initialTime[1].periodMoves > 1 && initialTime[1].periodTime > 0)
        )
    )

    // the default settings for gameclock

    const props = {
        adjustAction,
        adjustEventID,
        adjustPlayerID,
        adjustVal,
        clockMode,
        dispInfoNumPeriods: hasMultiplePeriods,
        dispInfoPeriodMoves: hasMultiplePeriodMoves,
        dispInfoPlayerText: false,
        dispCountElapsedMainTime: false,
        dispCountElapsedNumPeriods: false,
        dispCountElapsedPeriodMoves: false,
        dispCountElapsedPeriodTime: false,
        dispFormatMainTimeFSNumDigits: 0,
        dispFormatMainTimeFSLastNumSecs: 0,
        dispFormatMainTimeFSUpdateInterval: 1,
        dispFormatPeriodTimeFSNumDigits: 0,
        dispFormatPeriodTimeFSLastNumSecs: 0,
        dispFormatPeriodTimeFSUpdateInterval: 1,
        dispOnExpired: null,
        gameClockID: 'go',
        initialTime,
        minActiveClocks: 2,
        mode,
        numMoves,
        handleAdjust,
        handleElapsedMainTime,
        handleElapsedPeriod,
        handleInit,
        handleMadeMove,
        handlePaused,
        handlePlayerClockExpired,
        handleReset,
        handleResumed,
        handleTenCount
    }
    return props
}

exports.setNeedsUpdateCallback = function(handleUpdate) {
    handleNeedsUpdate = handleUpdate
}

exports.setResizeCallback = function(handleResize) {
    handleResizeClock = handleResize
}

// Callback functions exclusively for gameclock

let handleAdjust = function(o) {
    updateLastState(o)
    handleEvent('Adjust', o)
    adjustPromiseResolve()
}

let handleElapsedMainTime = function(o) {
    updateLastState(o)
    handleEvent('ElapsedMainTime', o)
}

let handleElapsedPeriod = function(o) {
    updateLastState(o)
    handleEvent('ElapsedPeriod', o)
}

let handleInit = function(o) {
    updateLastState(o)
    handleEvent('Init', o)
    if (handleResizeClock != null) {
        handleResizeClock()
    }
    exports.reset()
}

let handleMadeMove = function(o) {
    updateLastState(o)
    updateLastClockOnMove(o)
    handleEvent('MadeMove', o)
}

let handlePaused = function(o) {
    updateLastState(o)
    handleEvent('Paused', o)
}

let handlePlayerClockExpired = function(o) {
    updateLastState(o)
    updateLastClockOnMove(o)
    handleEvent('Expired', o)
}

let handleReset = function(o) {
    updateLastState(o)
    handleEvent('Reset', o)
    if (handleResizeClock != null) {
        handleResizeClock()
    }
}

let handleResumed = function(o) {
    updateLastState(o)
    handleEvent('Resumed', o)
}

let handleTenCount = function(o) {
    updateLastState(o)
    handleEvent('TenCount', o)
}

// helper functions to calculate clock state for App and clock

exports.getPlayerEngineTimeLeft = async function (sign) {
    if (sign == null || initialTime == null) return {}
    let playerIndex = sign > 0 ? 0 : (sign < 0 ? 1 : null)
    if (playerIndex == null || initialTime[playerIndex] == null) return {}

    let initTime
    await (exports.getPlayerInitialTimeAsync(sign).then(res => {
        initTime = res})).catch(() => null)
    if (initTime == null) return {}

    let hasInitTime = initTime != null
    let hasFiniteInitMainTime = hasInitTime &&
        initTime.mainTime != null &&
        initTime.mainTime > 0 &&
        Number.isFinite(initTime.mainTime)
    let hasPeriodInit = hasInitTime &&
        initTime.numPeriods >= 1 &&
        initTime.periodMoves >= 1 &&
        initTime.periodTime > 0
    let hasInfiniteInitTime = !hasInitTime ||
        (!hasFiniteInitMainTime && clockMode === 'absolutePerPlayer') ||
        (!hasFiniteInitMainTime &&
            !hasPeriodInit && clockMode === 'byo-yomi')
    if (hasInfiniteInitTime) return {}


    let lastClock
    await (exports.getLastPlayerClockAsync(sign).then(res => {
        lastClock = res})).catch(() => null)
    let expired
    await (exports.isPlayerClockExpiredAsync(sign).then(res => {
        expired = res})).catch(() => null)

    let timeLeft
    let periodsLeft
    let stonesLeft

    if (expired) {
        timeLeft = 0
        stonesLeft = 0
        periodsLeft = 0
    } else if (clockMode === 'absolutePerPlayer' && hasFiniteInitMainTime) {
        if (lastClock == null) {
            timeLeft = initTime.mainTime
        } else {
            timeLeft = initTime.mainTime - lastClock.elapsedMainTime
        }
        stonesLeft = 0
        periodsLeft = 0
    } else if (clockMode === 'byo-yomi') {
        if (lastClock == null) {
            if (initTime.mainTime > 0) {
                timeLeft = initTime.mainTime
                stonesLeft = 0
                periodsLeft = 0
            } else {
                timeLeft = initTime.periodTime
                stonesLeft = initTime.periodMoves
                periodsLeft = initTime.numPeriods
            }
        } else {
            if (initTime.numPeriods == 1 &&
                initTime.periodMoves >= 1 &&
                initTime.periodTime > 0) {

                // canadian overtime
                if (initTime.mainTime > 0) {
                    timeLeft = initTime.mainTime - lastClock.elapsedMainTime
                    stonesLeft = 0
                    periodsLeft = 1
                } else {
                    timeLeft = initTime.periodTime - lastClock.elapsedPeriodTime
                    stonesLeft = initTime.periodMoves - lastClock.elapsedPeriodMoves
                    periodsLeft = 1
                }
            } else if (initTime.numPeriods >= 1 &&
                initTime.periodMoves == 1 &&
                initTime.periodTime > 0) {

                // byo-yomi can't be handled by GTP2 spec
                if (initTime.mainTime > 0) {
                    timeLeft = initTime.mainTime - lastClock.elapsedMainTime
                    stonesLeft = 0
                    periodsLeft = 0
                } else {
                    timeLeft = initTime.periodTime - lastClock.elapsedPeriodTime
                    stonesLeft = 1
                    periodsLeft = initTime.numPeriods - lastClock.elapsedNumPeriods
                }
            } else {
                // unsupported timing mode
                return {}
            }
        }
    } else {
        return {}
    }

    return {timeLeft: Number.parseInt(timeLeft),
        stonesLeft: Number.parseInt(stonesLeft)}
}

exports.isPlayerClockExpired = function(sign = null) {
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex != null && lastClock != null &&
        lastClock.length == 2 && lastClock[playerIndex] != null &&
        lastClock[playerIndex].state != null) {

        return (lastClock[playerIndex].state === 'expired')
    } else {
        return null
    }
}

exports.isPlayerClockExpiredAsync = async function(sign = null) {
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex != null && lastClock != null &&
        lastClock.length == 2 && lastClock[playerIndex] != null &&
        lastClock[playerIndex].state != null) {

        return (lastClock[playerIndex].state === 'expired')
    } else {
        return null
    }
}

// helper functions to manage App and clock state

exports.getClockMode = function() {
    return clockMode
}

exports.getClockModeAsync = async function() {
    return clockMode
}

exports.getLastActivePlayers = function() {
    return lastActivePlayers
}

exports.getLastPlayerClock = function(sign = null) {
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex != null && lastClock != null &&
        lastClock.length == 2 && lastClock[playerIndex] != null) {

        return lastClock[playerIndex]
    } else {
        return null
    }
}

exports.getLastPlayerClockAsync = async function(sign = null) {
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex != null && lastClock != null &&
        lastClock.length == 2 && lastClock[playerIndex] != null) {

        return lastClock[playerIndex]
    } else {
        return null
    }
}

exports.getLastPlayerClockOnMove = function(sign = null) {
    let playerIndex = (sign != null && sign > 0) ? 0 :
        (sign != null && sign < 0) ? 1
        : null
    if (playerIndex != null && lastClockOnMove != null &&
        lastClockOnMove.length == 2 && lastClockOnMove[playerIndex] != null) {

        return lastClockOnMove[playerIndex]
    } else {
        return null
    }
}

exports.getMode = function() {
    return mode
}

exports.getModeAsync = async function() {
    return mode
}

exports.getPlayerInitialTime = function(sign) {
    if (sign == null || initialTime == null || initialTime.length !== 2) {
        return null
    }

    let playerIndex = sign > 0 ? 0 : (sign < 0 ? 1 : null)
    if (playerIndex == null) return null

    if (initialTime[playerIndex] == null) return null
    return initialTime[playerIndex]
}

exports.getPlayerInitialTimeAsync = async function(sign) {
    if (sign == null || initialTime == null || initialTime.length !== 2) {
        return null
    }

    let playerIndex = sign > 0 ? 0 : (sign < 0 ? 1 : null)
    if (playerIndex == null) return null

    if (initialTime[playerIndex] == null) return null
    return initialTime[playerIndex]
}

exports.hasInitialTimeChanged = function() {
    return initialTimeChanged
}

exports.setInitialTimeChanged = function(val) {
    initialTimeChanged = val
}

exports.setPlayStarted = async function(started) {
    playStarted = started
}

exports.setUnknownLastMoveTime = async function(val) {
    unknownLastMoveTime = val
}

exports.getUnknownLastMoveTime = async function() {
    return unknownLastMoveTime
}

exports.shouldShowClocks = function() {
    return showClocks
}

exports.shouldShowClocksAsync = async function() {
    return showClocks
}

exports.getClockEnabled = function() {
    return clockEnabled
}

exports.getClockEnabledAsync = async function() {
    return clockEnabled
}

exports.setClockEnabled = async function(val) {
    if (val === false) {
        await (exports.pause())
        clockEnabled = val
    } else {
        clockEnabled = val
        await (forceUpdate())
    }
}

// App sets callback used to pass gameclock events processed by clock
exports.setHandleEvent = function(handle) {
    handleEventCallback = handle
}

exports.toggleClockEnabled = function() {
    exports.setClockEnabled(!clockEnabled)
}

// helper functions only used internally in clock

let forceUpdate = async function() {
    if (handleNeedsUpdate != null) {
        await (handleNeedsUpdate())
    }
}

let handleEvent = function(eventName, o) {
    if (handleEventCallback != null) {
        handleEventCallback(eventName, o)
    }
}

let setShowClocks = async function(show) {
    if (show !== showClocks) {
        showClocks = show
        await (forceUpdate())
    }
}

let updateLastClockOnMove = function({playerID = null, clock = null, activePlayers} = {}) {
    if (lastClockOnMove == null || lastClockOnMove.length !== 2) {
        lastClockOnMove = [null, null]
    }
    if (playerID === 'b') {
        lastClockOnMove[0] = clock
    } else if (playerID === 'w') {
        lastClockOnMove[1] = clock
    }
}

let updateLastState = function({playerID = null, clock = null, activePlayers} = {}) {
    if (lastClock == null || lastClock.length !== 2) {
        lastClock = [null, null]
    }
    if (playerID === 'b') {
        lastClock[0] = clock
    } else if (playerID === 'w') {
        lastClock[1] = clock
    }
    lastActivePlayers = activePlayers
}

let validateClockSettings = async function() {
    // check how many clocks set; if only one set, set the other to Infinity
    if (initialTime == null || initialTime.length !== 2) {
        await (setShowClocks(false))
        return
    }

    let playerIndex = null

    let blackHasTime = (initialTime[0] != null &&
        initialTime[0].mainTime != null)
    let blackHasInfiniteTime = !blackHasTime ||
        (blackHasTime && initialTime[0].mainTime == Infinity)
    let whiteHasTime = (initialTime[1] != null &&
        initialTime[1].mainTime != null)
    let whiteHasInfiniteTime = !whiteHasTime ||
        (whiteHasTime && initialTime[1].mainTime == Infinity)

    if (blackHasInfiniteTime && whiteHasInfiniteTime) {
        showClocks = false
    } else {
        showClocks = true
    }

    if (blackHasTime && !blackHasInfiniteTime && !whiteHasTime) {
        playerIndex = 1
    } else if (whiteHasTime && !whiteHasInfiniteTime && !blackHasTime) {
        playerIndex = 0
    }
    if (playerIndex == null) {
        return
    }

    let playerID = playerIndex === 0 ? 'b' : 'w'
    let playerText = null
    let mainTime = Infinity
    let mainMoves = 0
    let periodTime = 0
    let numPeriods = 0
    let periodMoves = 0
    initialTime[playerIndex] = {
        mainTime,
        mainMoves,
        numPeriods,
        periodMoves,
        periodTime,
        playerID,
        playerText
    }
}
