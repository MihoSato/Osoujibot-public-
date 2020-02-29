function doPost(e) {
  const postData = JSON.parse(e.postData.getDataAsString());
  const recievedMessage = postData.event.text.replace(/<@.+>\s*/,"");  //postData.event.text: <@slackID> hogehoge 
  const channelName = postData.event.channel;  //The name of the channel you received message from
  if (recievedMessage === "掃除完了") {
    const replyOptions = ["掃除ありがとう！","すばらしい!","お疲れさま〜！","ほんま？"];
    const rand = Math.floor(Math.random() * replyOptions.length);
    const sampledMessage = replyOptions[rand];
    sendReply(channelName, sampledMessage);
    updateCleaningStatus();
  }
}

function sendReply(channelName, message){
  const url = "https://slack.com/api/chat.postMessage";
  const token = "XXXXXXXXXXXXXXXXXXXXXXXXX";  // Put in your token
  const data = {
    "channel": channelName,
    "text": message,
    "as_user": true
  }

  const options = {
    "method": 'post',
    "contentType": 'application/json; charset=UTF-8',
    "headers": {'Authorization': 'Bearer '+token},
    "payload" : JSON.stringify(data)
  };
  UrlFetchApp.fetch(url, options)
}

function updateCleaningStatus() {
  const spreadSheetId = "XXXXXXXXXXXXXXXXXXXXXXXXX";  //Put your spreadsheet's ID
  const sheetObj = SpreadsheetApp.openById(spreadSheetId);
  const statusSheet = sheetObj.getSheetByName("cleaningStatus");
  statusSheet.getRange(1, 1).setValue(1);
}
