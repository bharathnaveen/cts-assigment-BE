const express = require("express");
const convert = require("xml-js");
const fileUpload = require("express-fileupload");

const app = express();

//middleware
app.use(express.static(__dirname));
app.use(fileUpload());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

/*
- POST API method which validate both XML and CSV format,
- It will validate all transaction reference no should be unique,
- and end balance should be validated based on start balance + mutation values.
*/
app.post("/upload", (req, res) => {
  let records = [];
  let errorRecords = [];
  if (req.files.uploadedFile.name.indexOf('.xml') != -1) { // XML File Validations
    let data = req.files.uploadedFile.data.toString();
    records = (JSON.parse(convert.xml2json(data, { compact: true, spaces: 4 }))).records.record;
    for (const record of records) {
      let isUnique = true;
      let isEndBalanceCorrect = true;
      //Transaction Reference Unique Validation
      if (record._attributes.reference && records.filter(value => value._attributes.reference == record._attributes.reference).length > 1) {
        isUnique = false;
      }
      //End Balance Validation
      if ((parseFloat(record.startBalance._text) + parseFloat(record.mutation._text)).toFixed(2) != parseFloat(record.endBalance._text).toFixed(2)) {
        isEndBalanceCorrect = false;
      }
      if (!isUnique || !isEndBalanceCorrect) {
        let error = !isUnique && !isEndBalanceCorrect ? "Duplicate Reference No, Incorrect End Balance" : !isUnique && isEndBalanceCorrect ? "Duplicate Reference No" : "Incorrect End Balance";
        errorRecords.push({ Reference: record._attributes.reference, Description: record.description._text, error });
      }
    }
  } else if (req.files.uploadedFile.name.indexOf('.csv')) { // CSV File Validations
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
      //Transaction Reference Unique Validation
      if (record.Reference && records.filter(value => value.Reference == record.Reference).length > 1) {
        isUnique = false;
      }
      //End Balance Validation
      if ((parseFloat(record.Start_Balance) + parseFloat(record.Mutation)).toFixed(2) != parseFloat(record.End_Balance).toFixed(2)) {
        isEndBalanceCorrect = false;
      }
      if (!isUnique || !isEndBalanceCorrect) {
        let error = !isUnique && !isEndBalanceCorrect ? "Duplicate Reference No, Incorrect End Balance" : !isUnique && isEndBalanceCorrect ? "Duplicate Reference No" : "Incorrect End Balance";
        errorRecords.push({ Reference: record.Reference, Description: record.Description, error });
      }
    }
  }
  res.send(errorRecords);
});

app.listen(3000, function () {
  console.log("Working on port 3000");
});
