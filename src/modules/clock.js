const helper = require('../modules/helper')

let adjustAction,
    adjustEventID,
    adjustPlayerID,
    adjustVal,
    clockMode,
    initialTime,
    mode,
    numMoves,
    lastActivePlayers,
    lastClock,
    lastClockOnMove,
    handleEventCallback,
    handleNeedsUpdate,
    handleResizeClock,
    initialTimeChanged,
    lastMode,
    showClocks

exports.shouldShowClocks = function() {
    return showClocks
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

exports.getMode = function() {
    return mode
}

exports.getClockMode = function() {
    return clockMode
}

let setShowClocks = function(show) {
    if (show !== showClocks) {
        showClocks = show
        exports.forceUpdate()
    }
}

let checkTwoClocks = function() {
    // check how many clocks set; if only one set, set the other to Infinity
    if (initialTime == null || initialTime.length !== 2) {
        setShowClocks(false)
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

exports.equalMainTime = function() {
    if (initialTime == null || initialTime.length !== 2 ||
        initialTime[0] == null || initialTime[1] == null ||
        initialTime[0].mainTime == null || initialTime[1].mainTime == null) {

        return false
    }

    return (initialTime[0],mainTime === initialTime[1],mainTime)
}

exports.adjustPlayerClock = function(sign = null, action = null, val = null) {
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
    exports.forceUpdate()
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

    checkTwoClocks()
    exports.forceUpdate()
}

exports.makeMove = function() {
    if (mode == null || mode === 'init' || mode === 'reset') {
        checkTwoClocks()
    }
    if (numMoves != null) {
        numMoves++
    }
    exports.forceUpdate()
}

exports.pause = function() {
    mode = 'pause'
    exports.forceUpdate()
}

exports.pauseLast = function() {
    lastMode = mode
    exports.pause()
}

exports.resume = function() {
    if (mode == null || mode === 'init' || mode === 'reset') {
        checkTwoClocks()
    }
    mode = 'resume'
    exports.forceUpdate()
}

exports.resumeLast = function() {
    if (lastMode === 'resume') {
        lastMode = mode
        exports.resume()
    }
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

    checkTwoClocks()
    exports.forceUpdate()
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
    } else {
        initialTime[playerIndex] = null
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
        if (!helper.shallowEquals(initTime, initialTime[playerIndex])) {
            initialTime[playerIndex] = initTime
            exports.setInitialTimeChanged(true)
        }
    }
}

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

exports.setPlayerClockTime = function({sign = null, elapsedTime = null} = {}) {
    if (sign == null || elapsedTime == null) return

    let {
        elapsedMainTime: mainTime,
        elapsedNumPeriods: numPeriods,
        elapsedPeriodMoves: periodMoves,
        elapsedPeriodTime: periodTime,
        elapsedTotalTime: totalTime
    } = elapsedTime

    exports.adjustPlayerClock(sign, 'setElapsedMainTime', mainTime)
    exports.adjustPlayerClock(sign, 'setElapsedNumPeriods', numPeriods)
    exports.adjustPlayerClock(sign, 'setElapsedPeriodMoves', periodMoves)
    exports.adjustPlayerClock(sign, 'setElapsedPeriodTime', periodTime)
    exports.adjustPlayerClock(sign, 'setElapsedTotalTime', totalTime)
}

exports.setInitialTimeNull = function() {
    if (initialTime != null) {
        initialTime[0] = null
        initialTime[1] = null
    }
    initialTime = null
    exports.setInitialTimeChanged(true)
}

exports.hasInitialTimeChanged = function() {
    return initialTimeChanged
}

exports.setInitialTimeChanged = function(val) {
    initialTimeChanged = val
}

exports.setNeedsUpdateCallback = function(handleUpdate) {
    handleNeedsUpdate = handleUpdate
}

exports.setResizeCallback = function(handleResize) {
    handleResizeClock = handleResize
}

exports.forceUpdate = function() {
    if (handleNeedsUpdate != null) {
        handleNeedsUpdate()
    }
}

exports.setHandleEvent = function(handle) {
    handleEventCallback = handle
}

let handleEvent = function(eventName, o) {
    if (handleEventCallback != null) {
        handleEventCallback(eventName, o)
    }
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

exports.getLastActivePlayers = function() {
    return lastActivePlayers
}

exports.isLastPlayerClockExpired = function(sign = null) {
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

let handleAdjust = function(o) {
    updateLastState(o)
    handleEvent('Adjust', o)
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
        dispFormatPeriodTimeFSNumDigits: 1,
        dispFormatPeriodTimeFSLastNumSecs: 10,
        dispFormatPeriodTimeFSUpdateInterval: 0.1,
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
