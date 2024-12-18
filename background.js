const interval = 60*1000;
const alert_interval = 25*60*1000;

function main() {
    function updateTimer(tabs) {
        function onError(error){
            console.log(`Error in Storage API ${error}`);
            browser.storage.local.set({"ytIntrrupt" : {"day": now.getDay(), "logged": 0}});
        }
        function onGot(item) {
            //Check Response from Content Script
            function handleResponse(response) {
                if (response == undefined){
                    console.log("Content Script died, injected new script");
                    browser.tabs.executeScript({file : "/content.js"});
                    browser.tabs.sendMessage(tabs[0].id,
                        {command: "updateUI",
                         logged: item.ytIntrrupt.logged
                        },
                        handleResponse);
                } else {
                    console.log(response.content);
                    return true
                }
            }
            //Logic to update timer
            if ((item.ytIntrrupt == undefined) ||
                (item.ytIntrrupt.day == undefined) ||
                (item.ytIntrrupt.logged == undefined) ||
                (item.ytIntrrupt.day != now.getDay())) {
                    item.ytIntrrupt = {"day": now.getDay(), "logged": 0};
                }
            else{
                item.ytIntrrupt.logged += interval
            }
            browser.storage.local.set({"ytIntrrupt" : item.ytIntrrupt});
            //Send appropriate message to content script
            if (item.ytIntrrupt.logged != 0 && item.ytIntrrupt.logged % alert_interval == 0){
                //Update UI and alert
                browser.tabs.sendMessage(tabs[0].id,
                     {command: "updateUI&alert",
                      logged: `${item.ytIntrrupt.logged/(60*1000)} min`,
                      alert: `It's time to take a break 🙂, WatchTime logged is ${item.ytIntrrupt.logged/(60*1000)} min`
                     },
                      handleResponse);
            } else {
                browser.tabs.sendMessage(tabs[0].id,
                     {command: "updateUI",
                      logged: `${(item.ytIntrrupt.logged/(60*1000))} min`
                     },
                      handleResponse);
            }
        }
        const now = new Date();
        browser.storage.local.get("ytIntrrupt").then(onGot, onError);
    }
    function checkYT(tabs) {
        if (tabs.length > 0) {
            try {
              const url = new URL(tabs[0].url);
              const isYouTube = 
                url.hostname === 'www.youtube.com' || 
                url.hostname === 'youtube.com' ||
                url.hostname.endsWith('.youtube.com');
        
              if (isYouTube) {
                console.log("Youtube is active");
                updateTimer(tabs);
              } else {
                console.log("YT not active");
              }
            } catch (error) {
              console.error("Error parsing URL:", error);
            }
        }        
    }
    console.log("main is invoked");
    browser.tabs.query({active: true, currentWindow: true}, checkYT);
}

setInterval(main, interval);