function main {
  const slackWebhookUrl = "https://hooks.slack.com/services/XXXXXXXXXXXXXXXXXXXXX";  //Put in your webhook's URL
  const pickNum = 2;  // The number of members you wanna pick up
  const weekNum = 3;  // How many weeks to send a cleaning rota on every Monday
  
  //Get Spread Sheet
  const spreadSheetId = "XXXXXXXXXXXXXXXXXXXXX"; //Put in your spreadsheet's ID
  const sheetObj = SpreadsheetApp.openById(spreadSheetId);
  const masterSheet = sheetObj.getSheetByName("master");  //Member list (User name, SlackID, Mask label)
  const rotaLogSheet = sheetObj.getSheetByName("rotaLog");  //Log of a cleaning rota
  const masterSheetLastRow = masterSheet.getLastRow();
  const masterSheetVals = masterSheet.getRange(1,1,masterSheetLastRow,3).getValues();
  
  const names = masterSheetVals.getColumnFrom2DArray(0);
  const ids =  masterSheetVals.getColumnFrom2DArray(1);
  const name_id_dic = createDic(names, ids);   //Dict to use when you wanna change a username to a slackID (key:name,value:id)
  const mask = masterSheetVals.getColumnFrom2DArray(2);
  const maskedNames = names.maskFilter(mask);
  const usedNames = names.filter(v => maskedNames.indexOf(v) === -1);
  
  //const today = Moment.moment("XXXX/XX/XX");  //for test
  const today = Moment.moment();  //for deploy
  
  if (today.day() === 1){  // 1:Monday
    let sampledNames = randomSample(maskedNames, pickNum);
    updateMask(masterSheet, names, sampledNames);
    
    let updatedMask = masterSheet.getRange(1, 3, masterSheetLastRow).getValues();
    if (updatedMask.isAllZero()) {
      resetMask(masterSheet, masterSheetLastRow);
    }
    if (sampledNames.length < pickNum) {
      const additionalNames = randomSample(usedNames, pickNum - sampledNames.length);
      updateMask(masterSheet, names, additionalNames);
      sampledNames = sampledNames.concat(additionalNames);
    }
    
    updateRotaLog(rotaLogSheet, today, weekNum, pickNum, sampledNames);
    
    const post =  createPost (rotaLogSheet, weekNum, pickNum, name_id_dic);
    UrlFetchApp.fetch(slackWebhookUrl, post);
  }
}

Array.prototype.getColumnFrom2DArray = function(col_idx) {
  return this.map(function(v) {return v[col_idx];});
}

Array.prototype.maskFilter = function(mask) {
  return this.filter(function(v ,i) {return mask[i];});
}

Array.prototype.isAllZero = function() {
  return this.every(function(v) {return v[0] === 0;});
}

function createDic (keyArr,valueArr) {
  let newDic = {};
  keyArr.forEach(function(v, i) {
    newDic[v] = valueArr[i];
  })
  return newDic;
}

function randomSample(arr, num) {
  let newArr = [];
  let rand = 0;
  while (newArr.length < num && arr.length > 0) {
    rand = Math.floor(Math.random() * arr.length);
    newArr.push(arr[rand]);
    arr.splice(rand, 1);
  }
  return newArr;
}

function updateMask(sheet, masterNames, sampledNames) {
  sampledNames.forEach(function(i) {
    sheet.getRange(masterNames.indexOf(i)+1, 3).setValue(0);
  })
}

function resetMask(sheet, lastRow) {
  const range = sheet.getRange(1, 3, lastRow);
  let ones = [];
  for (let i=0; i < lastRow; i++) {
    ones[i] = [1];
  }
  range.setValues(ones);
}

function updateRotaLog(sheet, day, weekNum, pickNum, sampledNames) {
    const monday = day.clone().add((weekNum - 1) * 7, "days");
    const friday = monday.clone().add(4, "days"); 
    const rotaLogSheet_lastrow = sheet.getLastRow();
    sheet.getRange(rotaLogSheet_lastrow + 1 ,1).setValue(monday.format("YYYY-MM-DD"));
    sheet.getRange(rotaLogSheet_lastrow + 1 ,2).setValue(friday.format("YYYY-MM-DD"));
    sheet.getRange(rotaLogSheet_lastrow + 1 ,3, 1, pickNum).setValues([sampledNames]);
}
                                     
function createPost (sheet, weekNum, pickNum, name_id_dic){
  const messageTemplate = "【掃除当番表】\n%s\n%s 今週のお掃除よろしくお願いします！\n";
  const sheetLastRow = sheet.getLastRow();
  const dateVals = sheet.getRange(sheetLastRow -weekNum +1, 1, weekNum, 2).getValues();
  const nameVals = sheet.getRange(sheetLastRow -weekNum +1, 3, weekNum, pickNum).getValues();
  let rota = "";
  const rotaTemplate = "%s(月) ~ %s(金)  %s\n";
  for (let i=0; i<weekNum; i++) {
    const monday = Utilities.formatDate( dateVals[i][0], "Asia/Tokyo", "M/dd");
    const friday = Utilities.formatDate( dateVals[i][1], "Asia/Tokyo", "M/dd");
    const names = nameVals[i].join(" & ")
    rota += Utilities.formatString(rotaTemplate, monday, friday, names);
  }
  const mentionIDs = nameVals[0].map(function(i) {
    return name_id_dic[i];
  });
  const message = Utilities.formatString(messageTemplate, rota, mentionIDs.join(" "));
    var payload  = {
    "text": message,
    "attachments" : [ {
        "text": "",
        "image_url": "XXXXXXXXXXXXXXXXXXXXX"  //Put in the image's URL you wanna send
    }]
  };
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
  };
  return options;
}