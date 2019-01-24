var express = require("express");
var convert = require("xml-js");
var fileUpload = require("express-fileupload");

var app = express();

//middleware
app.use(express.static(__dirname));
app.use(fileUpload());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.post("/upload", function (req, res) {
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file

  let records = [];
  let errorRecords = [];
  if (req.files.uploadedFile.name.indexOf('.xml') != -1) {
    let data = req.files.uploadedFile.data.toString();
    records = (JSON.parse(convert.xml2json(data, { compact: true, spaces: 4 }))).records.record;
    for (const record of records) {
      let isUnique = true;
      let isEndBalanceCorrect = true;
      //unique validation
      if (record._attributes.reference && records.filter(r => r._attributes.reference == record._attributes.reference).length > 1) {
        isUnique = false;

      }
      //end balance validation
      if ((parseFloat(record.startBalance._text) + parseFloat(record.mutation._text)).toFixed(2) != parseFloat(record.endBalance._text).toFixed(2)) {
        isEndBalanceCorrect = false;
      }

      if (!isUnique || !isEndBalanceCorrect) {
        let error = !isUnique && !isEndBalanceCorrect ? "duplicate reference no,incorrect end balance" : !isUnique && isEndBalanceCorrect ? "duplicate reference no" : "incorrect end balance";
        errorRecords.push({ Reference: record._attributes.reference, Description: record.description._text, error });
      }
    }

  } else if (req.files.uploadedFile.name.indexOf('.csv')) {
    let rows = req.files.uploadedFile.data.toString("utf8").trim().split("\n");
    let headers = [];
    for (let i = 0; i < rows.length; i++) {
      if (i === 0) {
        let headerNames = rows[i].split(",");
        for (let headerName of headerNames) {
          headers.push({ headerName: headerName, headerProperty: headerName.replace(' ', "_") });
        }
      } else {
        let row = rows[i].split(",");
        let record = {};
        for (let j = 0; j < headers.length; j++) {
          for (let k = 0; k < row.length; k++) {
            if (j == k) {
              record[headers[j].headerProperty] = row[k];
            }
          }
        }
        records.push(record);
      }

    }
    for (const record of records) {
      let isUnique = true;
      let isEndBalanceCorrect = true;
      //unique validation
      if (record.Reference && records.filter(r => r.Reference == record.Reference).length > 1) {
        isUnique = false;
      }
      //end balance validation
      if ((parseFloat(record.Start_Balance) + parseFloat(record.Mutation)).toFixed(2) != parseFloat(record.End_Balance).toFixed(2)) {
        isEndBalanceCorrect = false;
      }

      if (!isUnique || !isEndBalanceCorrect) {
        let error = !isUnique && !isEndBalanceCorrect ? "duplicate reference no,incorrect end balance" : !isUnique && isEndBalanceCorrect ? "duplicate reference no" : "incorrect end balance";
        errorRecords.push({ Reference: record.Reference, Description: record.Description, error });
      }
    }
  }
  res.send(errorRecords);
});

app.listen(3000, function () {
  console.log("Working on port 3000");
});
