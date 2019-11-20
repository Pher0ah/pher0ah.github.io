/**********************************************************************************************************************/
/*                                             Global Word Initialisation                                             */
/**********************************************************************************************************************/
//Global Constant Definitions
const fDEBUG = true;

//Setup our environment
Office.onReady(function () {
  // Office is ready
  $(document).ready(function () {
    // The document is ready
  });
});

/**********************************************************************************************************************/
/*                                                  Button Functions                                                  */
/**********************************************************************************************************************/

/* Description  : Button Response function to insert the Custom Properties Table at the current location
*  Author       : Hany Elkady
*  Reference    :
*
*  Created      : 16-NOV-2019
*  Last Modified: 16-NOV-2019
*
*  Status       : WiP
*/
function GeneTabPGInsertPTable(event) {

  //Debug Button Press
  fDEBUG ?
    insertHTML('<b>DEBUG:</b> You Have Pressed the Insert Properties Table Button', 'Normal') : null

  //Provide Warning to User
  insertHTML('<b>DELETE ME</b> Before Sending to your Customer', 'Normal');

  //Testing Insert Properties Table
  let oPropertiesTable = insertPropertiesTable();

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/

/* Description  : Button Response function to update the Custom Property from the table row at the current location
*  Author       : Hany Elkady
*  Reference    :
*
*  Created      : 16-NOV-2019
*  Last Modified: 16-NOV-2019
*
*  Status       : WiP
*/
function GeneTabPGUpdateProperty(event) {

  //Debug Button Press
  fDEBUG ?
    insertHTML('DEBUG: You Have Pressed the Update a Single Property Button', 'Normal') :
    null;

  //Get current table
  var oPropertiesTable = context.document.getSelection();
  getTableCell(oPropertiesTable, 2, 2, 'Hello World');

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/

/* Description  : Button Response function to update all Custom Property from the table at the current location
*  Author       : Hany Elkady
*  Reference    :
*
*  Created      : 16-NOV-2019
*  Last Modified: 16-NOV-2019
*
*  Status       : WiP
*/
function GeneTabPGUpdtAllProprty(event) {

  //Debug Button Press
  fDEBUG ?
    insertHTML('DEBUG: You Have Pressed the Update All Properties Button', 'Normal') :
    null;

  //Event Completed
  event.completed();
}

/**********************************************************************************************************************/


/**********************************************************************************************************************/
/*                                                 Internal Functions                                                 */
/**********************************************************************************************************************/

/* Description : Internal Function to Write text to the document
  * Author      : Hany Elkady
  * Reference   : 
  *
  * Created     : 16-NOV-2019
  * Modified    : 16-NOV-2019
  *
  * Status      : WiP
  *
  * Parameters  :
  *   @param {string} sSomeText   The text to be written
  *   @param {string} aSomeStyle  The Style to be used to write the text
  * 
*/
function insertHTML(sSomeText, sSomeStyle) {
  Word.run(function (context) {

    //Get the current selection range
    var itsSelection = context.document.getSelection();

    //Add text after that selection
    var itsSentance = itsSelection.insertHtml(`${sSomeText}`, Word.InsertLocation.end);
   
    // Use styleBuiltIn to use an enumeration of existing styles.
    // If your style is custom make sure to use: range.style = "name of your style";
    switch (sSomeStyle) {
      case 'No Spacing':
        itsSentance.styleBuiltIn = Word.Style.noSpacing;
        break;
      case 'Heading 1':
        itsSentance.styleBuiltIn = Word.Style.heading1;
        break;
      case 'Heading 2':
        itsSentance.styleBuiltIn = Word.Style.heading2;
        break;
      case 'Heading 3':
        itsSentance.styleBuiltIn = Word.Style.heading3;
        break;
        deafult:
        itsSentance.styleBuiltIn = Word.Style.normal;
    }

    // Synchronize the document state by executing the queued commands, and return a promise to indicate task completion.
    itsSentance = itsSentance.insertParagraph('', 'After');
    itsSentance.select;

    return context.sync(itsSentance);
  })
  .catch(function (error) {
    console.log('Error: ' + JSON.stringify(error));
    if (error instanceof OfficeExtension.Error) {
      console.log('Debug info: ' + JSON.stringify(error.debugInfo));
    }
  });
}

/**********************************************************************************************************************/

/* Description : Internal function to insert properties table into the current location
*  Author      : Hany Elkady
*  Reference   :
*
*  Created     : 16-NOV-2019
*  Modified    : 16-NOV-2019
*
*  Status      : WiP
*/
async function insertPropertiesTable() {
  Word.run((context) => {
    //Define Table Basic Outline
    let theTableData = [["Property", "Original Value", "New Value"],
                        ["Title"   , ""              , ""         ],
                        ["Subject" , ""              , ""         ]];

    //Find the current selection
    var theSelectionRange = context.document.getSelection();

    //Add an empty paragraph before inserting the table
    var theParagraph = await theSelectionRange.insertParagraph('hello', Word.InsertLocation.before);

    //Create Table after the current insertion point
    var thePropertiesTable = await theParagraph.insertTable(3, 3, Word.InsertLocation.after, theTableData);

    //Format Table with the correct Style
    thePropertiesTable.styleBuiltIn = Word.Style.gridTable5Dark_Accent3;
    thePropertiesTable.styleFirstColumn = false;

    return context.sync(thePropertiesTable);

  });
}

/**********************************************************************************************************************/

function getTableCell(oTable, iRow, iColumn, oNewValue) {
  Word.run((context) => {

    //Get the cell in question
    let theCell = oTable.getTableCell(iRow, iColumn).body;

    //If there is a value, lets write it while we have the cell
    oNewValue ? theCell.load(oNewValue) : null;

    context.sync();

    return theCell;
  });
}

/**********************************************************************************************************************/

/**********************************************************************************************************************/

/* Description :
* Author      :
* Reference   :
*
* Created     :
* Modified    :
*
* Status      :
*/
