import BrowserWindow from 'sketch-module-web-view'
const UI = require('sketch/ui')
const sketch = require('sketch')
const toArray = require('sketch-utils/to-array')
const tinycolor = require('tinycolor2')
const _ = require('lodash')
const momemt = require('moment')

const emailKey = 'toyboxRollerUser'

const options = {
  identifier: 'unique.id',
  redirectTo: "/list",
  width: 480,
  minWidth: 300,
  height: 960,
  show: false,
  loaded: false,
  alwaysOnTop: true,
}

let browserWindow = new BrowserWindow(options)
let webContents = browserWindow.webContents
let loaded = false

export default function onRun(context) {
  // only show the window when the page has loaded
  browserWindow.once('ready-to-show', () => {
    browserWindow.show()
    // setRules(context)
    setOnboarded(context)
    setUser(context)
  })

  // print a message when the page loads
  webContents.on('did-finish-load', () => {
    UI.message('UI loaded!')
  })

  webContents.on('getLocation', (s) => {
          // webUI.eval("window.redirectTo=\"" + String(whereTo) + "\"");
    var whereTo = options.redirectTo;
    webContents.executeJavaScript("window.redirectTo=\"" + String(whereTo) + "\"")
  })

  webContents.on('getData', (page) => {
    getData(context, page)
  })

  webContents.on('updateLayer', (id) => {
    updateLayer(id)
  })

  webContents.on('saveRules', (colors) => {
    context.api().setSettingForKey('colors', JSON.stringify(colors))
    setRules(context)
  })

  webContents.on('onboarded', (flag) => {
    context.api().setSettingForKey('onboarded', JSON.stringify(flag))
    setOnboarded(context)
  })

  webContents.on('saveUser', (email) => {
    context.api().setSettingForKey(emailKey, JSON.stringify(email))
    setUser(context)
  })

  webContents.on('setRules', () => {
    setRules(context)
  })

  webContents.on('selectLayer', (id) => {
    selectLayer(id)
  })

  webContents.on('swapProp', (id, prop, oldStyle, newStyle) => {
    let layers = selectLayer(id)

    _.each(layers, (l) => {
      if (prop === 'fills' || prop === 'borders') {
        // let props;

        // if (prop === 'fills') {
        //   props =l.style().fills()
        // }
        // if (prop === 'borders') {
        //   props =l.style().borders()
        // }


        // let respectiveProp = _.find(props, (r) => _.includes(newStyle.hex, String(r.color().immutableModelObject().hexValue())))
// // respectiveProp.setColor(MSImmutableColor.colorWithSVGString(newStyle.hex).newMutableCounterpart());




        sketch.fromNative(l).style[prop] = _.map(sketch.fromNative(l).style[prop], (fillOrBorder) => fillOrBorder.color === oldStyle ?  {color: newStyle.hex, thickness: fillOrBorder.thickness, position: fillOrBorder.position, enabled: fillOrBorder.enabled, fillType: fillOrBorder.fillType, gradient: fillOrBorder.gradient} : fillOrBorder)
      } else if ( prop === 'text') {
        var range = NSMakeRange(0,sketch.fromNative(l).text.length)
        var color = hexToColor(newStyle.hex)
        l.setIsEditingText(true)
        l.addAttribute_value_forRange(NSForegroundColorAttributeName, color, range)
        l.setIsEditingText(false)
      }
    });
  })

  webContents.on('loadList', (s) => {
    browserWindow.loadURL(require('../resources/webview.html'))
  })

  browserWindow.loadURL(require('../resources/webview.html'))
}

export function blurAfterSelection(context) {
  browserWindow.blur()
}

export function onSelectionChanged(context) {
  if (browserWindow.isVisible() == 1) {
    const action = context.actionContext
    const document = sketch.fromNative(action.document)

    const selection = toArray(action.newSelection)

    const count = selection.length
    if (count <= 1) {
      oldSelection = newSelection
      newSelection = document.selectedLayers

      _.map([oldSelection, newSelection], (s) => {
        let layers = s.map(layer => {
          return pageLayers(layer)
        })

        postComplianceSelected(compliance(layers))
      })
    }
  }
}

function hexToColor(hex, alpha) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex),
    red = parseInt(result[1], 16) / 255,
    green = parseInt(result[2], 16) / 255,
    blue = parseInt(result[3], 16) / 255,
    alpha = (typeof alpha !== 'undefined') ? alpha : 1;
  return NSColor.colorWithCalibratedRed_green_blue_alpha(red, green, blue, alpha)
}

function pageLayers(page) {
  if (page.layers) {
    let layers = page.layers

    while (_.find(layers, (layer) => layer.type == 'Artboard' || layer.type == 'Group')) {
      layers = _.flattenDeep(_.map(layers, (groupOrLayer) => _.get(groupOrLayer, 'layers', groupOrLayer)))
    }

    return layers
  }

  return page
}

function getData(context) {
  const document = sketch.fromNative(context.document)

  // let layers = _.flattenDeep(_.map(document.pages, (page) => pageLayers(page)))
  let layers = _.flattenDeep(pageLayers(document.pages[0]))

  console.log(layers.length)

  layers = _.chunk(layers, 100)[0]

  postData(compliance(layers))
}

function parseDocument(context) {
  const document = sketch.fromNative(context.document)

  let layers = _.flattenDeep(_.map(document.pages, (page) => pageLayers(page)))

  console.log(layers.length)

  layers = _.chunk(layers, 100)[0]

  postCompliance(compliance(layers))
}

function compliance(layers) {
  layers = _.flattenDeep(layers)

  return (_.flattenDeep(_.compact(_.map(layers, (l, i) => {
    return parseColor(l)
  }))))
}
function postCompliance(compliance) {
  webContents.executeJavaScript(`setCompliant('${JSON.stringify(compliance)}')`)
}

function postCompliance(compliance) {
  webContents.executeJavaScript(`setCompliant('${JSON.stringify(compliance)}')`)
}

function postData(compliance) {
  webContents.executeJavaScript(`postData('${JSON.stringify(compliance)}')`)
}

function postComplianceSelected(compliance) {
  webContents.executeJavaScript(`layerSelected('${JSON.stringify(compliance)}')`)
  browserWindow.blur()
}

function setRules() {
  let colors = context.api().settingForKey('colors')
  try {
    webContents.executeJavaScript(`setRules('${String(String(JSON.stringify(JSON.parse(String(colors)))))}')`)
  } catch (e) {
    console.log(e)
  }
}

function setOnboarded(context) {
  let onboarded = context.api().settingForKey('onboarded')
  webContents.executeJavaScript(`setOnboarded('${String(String(JSON.stringify(JSON.parse(String(onboarded)))))}')`)
}

function setUser() {
  let email = context.api().settingForKey(emailKey)
  webContents.executeJavaScript(`setUser('${String(String(JSON.stringify(JSON.parse(String(email)))))}')`)
}

function parseColor(layer) {
  let colors = [];
  try {
    colors = JSON.parse(context.api().settingForKey('colors'))
  } catch (e) {
    colors = []
  }

  colors = _.map(colors, (c) => tinycolor(String(c.hex)).toHex8())

  let props = ['fills', 'borders']

  if (layer.type === 'Text') {
    props.push('text')
  }


  const category = 'color'

  let parsed = []

  parsed =  (_.compact(_.map(props, (prop) => {
    if (_.get(layer, 'style')) {
      let attrs = {
        id: layer.id,
        name: escape(layer.name),
        category: category,
        prop: prop,
        createdAt: Date.now(),
        suggestions: []
      }

      if (prop === 'text') {
        let weights = [100,100,100,200,300,400,500,500,600,700,800,900,900,900,900,900]
        let weightIndex = NSFontManager.sharedFontManager().weightOfFont_(layer.sketchObject.font())

        let weight = weights[weightIndex]
        var fontSize = layer.sketchObject.fontSize()
        var lineHeight = layer.sketchObject.lineHeight()

        let fontFamily;
        let color = '000';
        if (layer.sketchObject.style().textStyle()) {
          fontFamily = String(layer.sketchObject.style().textStyle().attributes().NSFont.fontDescriptor().objectForKey(NSFontNameAttribute))
          color = layer.sketchObject.style().textStyle().attributes().MSAttributedStringColorAttribute.hexValue()
          color = `#${color}`
        }

        return ([
          {
            ...attrs,
            index: 0,
            styles: {...layer.style, ...{weight: weight, fontSize: fontSize, lineHeight: lineHeight, fontFamily: fontFamily}},
            primary: color,
            compliant: _.includes(colors, tinycolor(color).toHex8()),
          }
        ])
      }

      if (_.get(layer.style, prop)) {
        const styles = _.get(layer.style, prop)

        let i = -1
        return _.map(_.filter(styles, 'enabled'), (style) => {
          const color = style.color
          i = i + 1
          return ({
            ...attrs,
            index: i,
            styles: style.toJSON(),
            primary: color,
            compliant: _.includes(colors, tinycolor(color).toHex8()),
          })
        })
      }




    } else {
      return null
    }
  }))
  )


  return parsed

  // webContents.executeJavaScript(`setCompliant('${'color'}')`)
  // webContents.executeJavaScript(`setRandomNumber('${'color'}')`)


  // let color = layer.style.fills[0].color
  // if (_.includes(_.map(colors, (c) => tinycolor(String(c)).toHex8()), tinycolor(color).toHex8())) {
  //   color = `${color} is compliant!`
  //   webContents.executeJavaScript(`setRandomNumber('${color}')`)
  // } else {
  //   color = `${color} is NOT compliant!`
  //   webContents.executeJavaScript(`setRandomNumber('${color}')`)
  //   }
}

function updateLayer(id) {
  const document = sketch.fromNative(context.document)
  let layers = _.compact(_.flattenDeep(_.map(document.pages, (page) => {
    page = page.sketchObject
    if(page.deselectAllLayers){
      page.deselectAllLayers();
    }else{
      page.changeSelectionBySelectingLayers_([]);
    }
    return page.layersWithIDs([id])
  })))

  layers = _.map(layers, (layer) => _.map(_.flattenDeep(layer), (l) => {l.select_byExpandingSelection(true, true); return sketch.fromNative(l)}));

  layers = _.flatten(layers)

  return postData(compliance(layers))
}

let oldSelection = []
let newSelection = []

function selectLayer(id) {
  const document = sketch.fromNative(context.document)
  let layers = _.compact(_.flattenDeep(_.map(document.pages, (page) => {
    page = page.sketchObject
    if(page.deselectAllLayers){
      page.deselectAllLayers();
    }else{
      page.changeSelectionBySelectingLayers_([]);
    }
    return page.layersWithIDs([id])
  })))

  layers = _.map(layers, (layer) => _.map(_.flattenDeep(layer), (l) => {l.select_byExpandingSelection(true, true); return l}));

  layers = _.flatten(layers)

  let layer = layers[0]
  let rect = layer.absoluteRect().rect()

  let x = rect.origin.x - 50
  let y = rect.origin.y - 50
  let width = rect.size.width + 100
  let height = rect.size.height + 100
  rect = NSMakeRect(x, y, width, height)

  // MSDocument.currentDocument().contentDrawView().zoomToFitRect(layers[0].absoluteRect().rect())
  MSDocument.currentDocument().contentDrawView().zoomToFitRect(rect)

  return layers
}
