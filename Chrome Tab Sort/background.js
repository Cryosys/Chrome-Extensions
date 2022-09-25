let color = '#3aa757';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => group(tabId, tab)); 
chrome.tabs.onAttached.addListener((tabId, attachInfo) => groupByID(tabId));  

let lastTab = '';

async function groupByID(tabId)
{
  console.log('Tab ID: ' + tabId);
  let tab = await chrome.tabs.get(tabId);
  group(tabId, tab); 
}

async function group(tabId, tab) {
  try
   {
     console.log('entered');
      // Indicates the current status of the tab, only do stuff if it is complete. Otherwise the code will be executed multiple times.
      // console.log('Tab status: ' + tab.status);
      if(tab.incognito == true || tab.status != "complete")
      {
        console.log('entered 1');
        return;
      }

      if(tabId == lastTab)
      {
        console.log('entered 2');
        lastTab = '';
        return;
      }

      // console.log('Tab group ID: ' + tab.groupId);

      let createOptions;
      // In case the tab is already in a group
      if(tab.groupId != -1)
      {       
        let currentTitle = getDomain(tab.url);
        let group = await chrome.tabGroups.get(tab.groupId);
        
        // console.log('Group title : ' + group.title + '; current domain: ' + currentTitle);

        if(currentTitle != group.title)
        {
          // console.log('Group title does not match: ' + currentTitle + ' != ' + group.title);

          let queryInfo = { title: currentTitle, windowId: -2 };
          var groups = await chrome.tabGroups.query(queryInfo);

          // console.log('Group count: ' + groups.length);

          // The title may not match but there does not need to be a group with the correct title
          if(groups.length != 0)
          {
            createOptions = { groupId:groups[0].id, tabIds: [tabId]};
          }
          // Create a new group with the new title
          else
          {
            createOptions = { tabIds: [tabId]};
          }
        }
        else
        {
          // console.log('Group title matches');
          return;
        }
      }
      // In case that no group exists yet that the tab contains
      else
      {
        // console.log('Tab url: ' + tab.url);
        let domain = getDomain(tab.url);
        // console.log('Group URL: ' + domain);

        let queryInfo = { title: domain, windowId: -2 };
        var groups = await chrome.tabGroups.query(queryInfo);
        // console.log('Found groups: ' + groups.length);

        if(groups.length > 0)
        {
          let groupsText = '';
          for (let i = 0; i < groups.length; i++) 
          {
            groupsText += groups[i].id + ", ";
          }
          // console.log('Group IDs: ' + groupsText);

          createOptions = { groupId:groups[0].id, tabIds: [tabId]};
        }
        else
        {
          createOptions = { tabIds: [tabId]};
        }
      }
      
      lastTab = tabId;
      let Id = await chrome.tabs.group(createOptions);
      await groupCreateCallback(Id);

      return;
  } catch (error) {
    console.log('Error in group: ' + error);
    if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
      setTimeout(() => group(tabId, tab), 50);
    }
  }
}

async function groupCreateCallback(Id)
{
  // console.log('Group ID: ' + Id);
  
  let group = await chrome.tabGroups.get(Id);
  if(group.title == '')
  {
    var tabs = await chrome.tabs.query({groupId:Id});
    // console.log('Tab count: ' + tabs.length);
    if(tabs.length == 0){
       return;
      }

    let domain = getDomain(tabs[0].url);
    chrome.tabGroups.update(Id, { title:domain});
  }
}

function getDomain(url)
{
  let domain = (new URL(url));
  domain = domain.hostname.replace('www.','');

  var splits = domain.split(".");
  domain = splits.length > 1 ? splits[splits.length - 2] : splits[0];
  // console.log('Domain: ' + domain);
  return domain;
}

async function getCurrentTab() {
    try{    
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
    } catch(error){
        console.log('Error in getCurrentTab: ' + error);
        return null;
    }
  }