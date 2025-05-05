//Code for hw6
//THIS IS UPDATED FOR HW 8 TO BE MORE FUNCTIONAL PROGRAMMING FRIENDLY 
//Start of code get all modules in order
const http = require("http"); // web server module
const querystr = require('querystring'); // parse and format URL query strings
const url = require("url");

//import all needed methods from hw4.js
const { findNextDateHelper, reserveDateHelper, searchReservationsHelper, cancelReservationHelper, startProgram, startDatabase, closeDatabase } = require('./hw4');
const { parse, resolve } = require('path');

//Call startdatabase to make sure events are readable
startDatabase();

//not mutable so its good 
const port = 8080;

//Module to encapsulate status
const Status = (function() {
    let status = "200";

    //Function to get the current status
    function getStatus() {
        return status;
    }

    //Function to set the status
    function setStatus(newStatus) {
        status = newStatus;
    }

    return {
        getStatus,
        setStatus
    };
})();


//Function to start the server to accept client requests and send out server responses
function applicationServer(request, response) {
    let requestMethod = request.method;
    const entireUrl = url.parse(request.url, true);                                      //Get the path 
    let contentType = request.headers["content-type"];  
    if (!checkURLPath(entireUrl.pathname)) {                                             //Make sure the path is a valid request
        response.writeHead(400, { "Content-Type": "text/plain" } );
        response.end("Invalid Request, must use /findNext, /lookUp, /reserve, /cancel, /exit, /");
    }
    else {     
    let body = "";                                                                       //Parse the request 
    request.on("data", (chunk) => {
        body += chunk;
    });
    request.on("end", () => {                                                            //Attempt to parse the content types only accept url for possible front end development later
        if(contentType === "application/x-www-form-urlencoded") {
            let parsedMessage = (querystr.decode(body));
            let parsedArray = Object.entries(parsedMessage);
            runCommand(entireUrl.pathname, parsedArray, requestMethod)                   //Attempt to run requested command
        .then(output => {
            console.log(Status.getStatus());
            response.writeHead(Status.getStatus(), { "Content-Type": "text/plain" });
            if(output == "Goodbye") {
                response.end(output);
                webServer.close((err) => {                                               //Close the server
                    if (err) {
                        console.error("Error while closing the server:", err);
                        response.writeHead(500, { "Content-Type": "text/plain" });
                        response.end("Internal Server Error");
                        process.exit(1);                                                 //Error
                    } else {
                        console.log("Server closed successfully");
                        process.exit(0);                                                 //Exit with success code
                    }
                });

            }
            else {
                response.end(output);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            response.writeHead(500, { "Content-Type": "text/plain" });
            //closeDatabase();
            response.end(error.message || "Internal Server Error");
        });
        
        }
        else {                                                                           //URL format for input arguments of the old commands of hw4
            response.writeHead(400,{ "Content-Type": "text/plain" });
            //closeDatabase();
            response.end('Must input arguments to commands in URL format');
        }
    });

    }
}

//Function to make sure the path has one of the available client requests
function checkURLPath(path) {
    let allowwedURL = ["/findNext","/reserve","/lookUp","/cancel","/exit","/"];
    if(allowwedURL.includes(path)) {
        return true;
    }
    return false;
}

//Function that takes in the arguments from the url, the path which specifies the command, and what kind of request it was
//It returns the homework 4 outputs of each function 
async function runCommand(userInput, userParameters, requestMethod) {
   if (userInput == "/findNext") {
    return handleFindNext(userParameters, requestMethod);
   }
   else if (userInput == "/reserve") {
    return handleReserve(userParameters, requestMethod);
   }
   else if (userInput == "/lookUp") {
    return handleLookUp(userParameters, requestMethod);
   }
   else if (userInput == "/cancel") {
    return handleCancel(userParameters, requestMethod);
   }
   else if (userInput == "/exit") {
    return handleExit(requestMethod);
   }
   else if (userInput == "/") {
    return handleEmpty(requestMethod);
   }  
}

async function handleFindNext(userParameters, requestMethod) {
    if (requestMethod === 'GET') {                                                       //Checks to make sure right request method
        if(!argumentCheckerFN(userParameters)) {                                         //Checks the arguments always 
            Status.setStatus("406"); 
            return "Don't have required parameters to run findNext, which are (int) rangeFind and (int) numOfDays"
        }
        let rangeFind = userParameters.find(([key, value]) => key === "rangeFind")?.[1];
        let numOfDays = userParameters.find(([key, value]) => key === "numOfDays")?.[1];
        let datesFound = await findNextDateHelper(rangeFind, numOfDays);                       //Where it calls the homework 4 function
        if (datesFound == "Invalid number for number of dates (1-4), try again.\n" || datesFound == "Invalid number for range (1-100), try again.\n") {
            Status.setStatus("406"); 
            return datesFound;
        }
        let resultOutput = "";
            for(let i = 0; i < datesFound.length; i++) {
                if(datesFound[i] != undefined) {
                    resultOutput = resultOutput + i + " Available Date: " + (datesFound[i]) + "\n";
                }
            }
            Status.setStatus("200"); 
            return resultOutput;                                                         //Returns the result 
    }
    else {
        Status.setStatus("405"); 
        return "Must use GET to run /findNext";
    }
}

async function handleReserve(userParameters, requestMethod) {
    if (requestMethod === 'POST') { 
        if(!argumentCheckerRD(userParameters)) {
            Status.setStatus("406"); 
            return "Don't have required parameters to run reserveDate, which are dateToReserve (YYYYMMDDTHHMMSS) and attendeeToReserve (email/phone number)"
        }
        let dateToReserve = userParameters.find(([key, value]) => key === "dateToReserve")?.[1];
        let attendeeToReserve = userParameters.find(([key, value]) => key === "attendeeToReserve")?.[1];
    
        try {
            const reservationResult = await reserveDateHelper(dateToReserve, attendeeToReserve);
            if(reservationResult == "Invalid date (YYYYMMDDTTHHMMSS), date was already a scheduled event, or date was a not a future date." || reservationResult == "Date can not be a holiday or weekend." || reservationResult == "Patient must be a valid email or phone number.") {
                Status.setStatus("406"); 
                return reservationResult;
            }
            if(reservationResult === true) {
                Status.setStatus("200"); 
                return "Successfully added reservation";
            }
            Status.setStatus("200"); 
                return "Already added reservation";
        } catch (error) {
            console.error("Error:", error);
            Status.setStatus("406");
            return "Error during reservation";
        }
    }
    else {
        Status.setStatus("405"); 
        return "Must use POST to run /reserve";
    }
}

async function handleLookUp(userParameters, requestMethod) {
    if (requestMethod === 'GET') { 
        if(!argumentCheckerSR(userParameters)) {
            Status.setStatus("406"); 
            return "Don't have required parameters to run lookUp, which is patient (email/phone number)"
        }
        let patient = userParameters.find(([key, value]) => key === "patient")?.[1];
        let result = await searchReservationsHelper(patient);
        if(result == "Patient must be a valid email or phone number.") {
            Status.setStatus("406"); 
            return result;
        }
        else if(result.length < 1) {
            Status.setStatus("200"); 
            return "No reservations found.";
        }
        let resultOutput = "";
        if(!(result === undefined || result.length == 0)) {
            for(let i = 0; i < result.length; i++) {
                if(result[i].start != undefined) {
                    resultOutput = resultOutput + i + " Date Start: " + (result[i].start) + "\n  Confirmation Code: " + (result[i].confirmation) + "\n";
                }
            }
        }
            Status.setStatus("200"); 
            return resultOutput;
    }
    else {
       Status.setStatus("405");
       return "Must use GET to run /lookUp";
    }
}

async function handleCancel(userParameters, requestMethod) {
    if (requestMethod === 'PUT') { 
        if(!argumentCheckerCR(userParameters)) {
            Status.setStatus("406");
            return "Don't have required parameters to run cancel"
        }
            let cancelCode = userParameters.find(([key, value]) => key === "cancelCode")?.[1];
            try {
                const cancellationResult = await cancelReservationHelper(cancelCode);
                if(cancellationResult == "Invalid cancel code, must be a 10 digit alphanumeric code") {
                    Status.setStatus("406");
                    return cancellationResult;
                }
                Status.setStatus("200");
                return cancellationResult;
            } catch (error) {
                console.error("Error:", error);
                Status.setStatus("406");
                return "Error during cancellation";
            }
    }
    else {
        Status.setStatus("405"); 
        return "Must use PUT to run /cancel";
    }
}

async function handleExit(requestMethod) {
    if (requestMethod === 'POST') { 
        closeDatabase();
        Status.setStatus("200"); 
        return "Goodbye";
    }
    else {
        Status.setStatus("405"); 
        return "Must use POST to run /exit";
    }
}

async function handleEmpty(requestMethod) {
    if (requestMethod === 'GET') { 
        Status.setStatus("200");
        return "Welcome to Patient Schedule Planner!";
    }
    else {
        Status.setStatus("405"); 
        return "Must use GET to run /";
    }
}

//Function to check the arguments of /findNext
function argumentCheckerFN(userParameters) {
    if (userParameters.some(([key, value]) => key === "rangeFind") && userParameters.some(([key, value]) => key === "numOfDays")) {
        return true;
    }
    return false;
}

//Function to check the arguments of /reserve
function argumentCheckerRD(userParameters) {
    if (userParameters.some(([key, value]) => key === "dateToReserve") && userParameters.some(([key, value]) => key === "attendeeToReserve")) {
        return true;
    }
    return false;
}

//Function to check the arguments of /lookUp
function argumentCheckerSR(userParameters) {
    if (userParameters.some(([key, value]) => key === "patient")) {
        return true;
    }
    return false;
}

//Function to check the arguments of /cancel
function argumentCheckerCR(userParameters) {
    if (userParameters.some(([key, value]) => key === "cancelCode")) {
        return true;
    }
    return false;
}

//Create and listen to server
const webServer = http.createServer(applicationServer);
console.debug("Started Server on " + port);
webServer.listen(port);

//Export for testing 
module.exports = webServer;