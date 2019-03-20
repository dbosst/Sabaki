const fs = require('fs')

let id = 0

exports.linebreak = process.platform === 'win32' ? '\r\n' : '\n'
exports.noop = () => {}

exports.getId = function() {
    return ++id
}

exports.hash = function(str) {
    let hash = 0, chr
    if (str.length == 0) return hash

    for (let i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash = hash & hash
    }

    return hash
}

exports.equals = function(a, b) {
    if (a === b) return true
    if (a == null || b == null) return a == b

    let t = Object.prototype.toString.call(a)
    if (t !== Object.prototype.toString.call(b)) return false

    let aa = t === '[object Array]'
    let ao = t === '[object Object]'

    if (aa) {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++)
            if (!exports.equals(a[i], b[i])) return false
        return true
    } else if (ao) {
        let kk = Object.keys(a)
        if (kk.length !== Object.keys(b).length) return false
        for (let i = 0; i < kk.length; i++) {
            let k = kk[i]
            if (!(k in b)) return false
            if (!exports.equals(a[k], b[k])) return false
        }
        return true
    }

    return false
}

exports.shallowEquals = function(a, b) {
    return a == null || b == null ? a === b : a === b || a.length === b.length && a.every((x, i) => x == b[i])
}

exports.vertexEquals = function([a, b], [c, d]) {
    return a === c && b === d
}

exports.lexicalCompare = function(a, b) {
    if (!a.length || !b.length) return a.length - b.length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : exports.lexicalCompare(a.slice(1), b.slice(1))
}

exports.typographer = function(input) {
    return input.replace(/\.{3}/g, '…')
        .replace(/(\S)'/g, '$1’')
        .replace(/(\S)"/g, '$1”')
        .replace(/'(\S)/g, '‘$1')
        .replace(/"(\S)/g, '“$1')
        .replace(/(\s)-(\s)/g, '$1–$2')
}

exports.normalizeEndings = function(input) {
    return input.replace(/\r\n|\n\r|\r/g, '\n')
}

exports.isTextLikeElement = function(element) {
    return ['textarea', 'select'].includes(element.tagName.toLowerCase())
        || element.tagName.toLowerCase() === 'input'
        && !['submit', 'reset', 'button', 'checkbox', 'radio', 'color', 'file'].includes(element.type)
}

exports.popupMenu = function(template, x, y) {
    let {remote} = require('electron')
    let setting = remote.require('./setting')
    let zoomFactor = +setting.get('app.zoom_factor')

    remote.Menu.buildFromTemplate(template).popup({
        x: Math.round(x * zoomFactor),
        y: Math.round(y * zoomFactor)
    })
}

exports.wait = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

exports.isWritableDirectory = function(path) {
    if (path == null) return false

    let fileStats = null

    try {
        fileStats = fs.statSync(path)
    } catch (err) {}

    if (fileStats != null) {
        if (fileStats.isDirectory()) {
            try {
                fs.accessSync(path, fs.W_OK)
                return true
            } catch (err) {}
        }

        // Path exists, either no write permissions to directory or path is not a directory
        return false
    } else {
        // Path doesn't exist
        return false
    }
}

exports.boundFinite = function(num, absBound) {
    if (num < 0 && num == -Infinity) {
        return -absBound
    } else if (num > 0 && num == Infinity) {
        return absBound
    } else {
        return num
    }
}

exports.truncatePreciseToNumber = function(num, digits = 0) {
    let f = Number.parseFloat(num)
    if (Number.isNaN(f) || !Number.isFinite(f)) return null
    let s = String(f)
    let dot = s.indexOf('.')
    if (dot === -1) {
        return Number.parseFloat(s)
    }
    if (!Number.isFinite(digits) || digits < 0) digits = 0
    let len = s.length
    let prec = len - dot - 1
    let newlen = digits === 0 ? len - prec - 1 : len - prec + digits
    return Number.parseFloat(s.slice(0,
        Math.max(1, Math.min(len, newlen))))
}

exports.formatSecondsToUnits = function(sec, maxNumUnits = 1) {
    let str
    if (sec < 60) {
        str = String(sec) + ' sec.'
    } else if (sec < 3600) {
        let unitMinutes = Math.floor(sec / 60)
        let unitSeconds = sec - (unitMinutes * 60)
        str = String(unitMinutes) + ' min.'
        let unitsLeft = maxNumUnits - 1
        if (unitSeconds !== 0 && unitsLeft > 0) {
            str += ' ' + String(unitSeconds) + ' sec.'
        }
    } else {
        let unitHours = Math.floor(sec / 3600)
        let unitMinutes = Math.floor((sec - (unitHours * 3600)) / 60)
        let unitSeconds = sec - (unitHours * 3600) - (unitMinutes - 60)
        str = String(unitHours) + ' hr.'
        let unitsLeft = maxNumUnits - 1
        if (unitMinutes !== 0 && unitsLeft > 0) {
            str += ' ' + String(unitMinutes) + ' min.'
            unitsLeft--
        }
        if (unitSeconds !== 0 && unitsLeft > 0) {
            str += ' ' + String(unitSeconds) + ' sec.'
        }
    }
    return str
}

exports.getStyleSheet = function(title) {
    if (document == null || document.styleSheets == null) {
        return null
    }
    let x
    for (x = 0; x < document.styleSheets.length; x++) {
        let sheet = document.styleSheets[x];
        if (title === sheet.title) {
            return sheet
        }
    }
    return null
}

// polyfill for deleteRule and insertRule
if (!CSSStyleSheet.prototype.deleteRule) CSSStyleSheet.prototype.deleteRule = CSSStyleSheet.prototype.removeRule;

(function(Sheet_proto){
  var originalInsertRule = Sheet_proto.insertRule;

  if (originalInsertRule.length === 2){ // 2 mandatory arguments: (selector, rules)
    Sheet_proto.insertRule = function(selectorAndRule){
      // First, separate the selector from the rule
      a: for (var i=0, Len=selectorAndRule.length, isEscaped=0, newCharCode=0; i !== Len; ++i) {
        newCharCode = selectorAndRule.charCodeAt(i);
        if (!isEscaped && (newCharCode === 123)) { // 123 = "{".charCodeAt(0)
          // Secondly, find the last closing bracket
          var openBracketPos = i, closeBracketPos = -1;

          for (; i !== Len; ++i) {
            newCharCode = selectorAndRule.charCodeAt(i);
            if (!isEscaped && (newCharCode === 125)) { // 125 = "}".charCodeAt(0)
              closeBracketPos = i;
            }
            isEscaped ^= newCharCode===92?1:isEscaped; // 92 = "\\".charCodeAt(0)
          }

          if (closeBracketPos === -1) break a; // No closing bracket was found!
            /*else*/ return originalInsertRule.call(
            this, // the sheet to be changed
            selectorAndRule.substring(0, openBracketPos), // The selector
            selectorAndRule.substring(closeBracketPos), // The rule
            arguments[3] // The insert index
          );
        }

        // Works by if the char code is a backslash, then isEscaped
        // gets flipped (XOR-ed by 1), and if it is not a backslash
        // then isEscaped gets XORed by itself, zeroing it
        isEscaped ^= newCharCode===92?1:isEscaped; // 92 = "\\".charCodeAt(0)
      }
      // Else, there is no unescaped bracket
      return originalInsertRule.call(this, selectorAndRule, "", arguments[2]);
    };
  }
})(CSSStyleSheet.prototype);
