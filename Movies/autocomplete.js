// Description: Creates an AutoComplete Input DOM
// Input: Configuration Object
//
const createAutoComplete = ({ root, renderOption, onOptionSelect, inputValue, fetchData }) => {

  //Create the Root HTML element for the Autcomplete Selector
  root.innerHTML = `
    <label><b>Search</b></label>
    <input class="input" />
    <div class="dropdown">
      <div class="dropdown-menu">
        <div class="dropdown-content results"></div>
      </div>
    </div>  
  `;

  const input = root.querySelector('input');     //Get the Input Selector
  const dropdown = root.querySelector('.dropdown'); //Get the dropdown element
  const resultsWrapper = root.querySelector('.results');  //Get the results area

  // Description: Create an onInput call to initiate a search
  //
  //
  const onInput = async event => {
    //Get options
    const items = await fetchData(event.target.value);

    //Check if we got any items back
    if (!items) {
      console.log("no items")
      dropdown.classList.remove('is-active');
      return;
    }

    //Clear Results
    resultsWrapper.innerHTML = ``;
    dropdown.classList.add('is-active');

    //Loop over all results and generate dropdown options
    items.forEach(item => {
      const option = document.createElement('a');

      //Add an option in the DOM
      option.classList.add('dropdown-item');
      option.innerHTML = renderOption(item);

      //Add eventlistner for the option
      option.addEventListener('click', () => {
        dropdown.classList.remove('is-active');
        input.value = inputValue(item);
        onOptionSelect(item);
      });

      //Insert the div in the right place
      resultsWrapper.appendChild(option);

    });
  };

  //Add an event listener for input change, and debounce it (default 1s)
  input.addEventListener('input', debounce(onInput));

  //Add an event listener for clicking out of the input
  document.addEventListener('click', event => {
    if (!root.contains(event.target)) {
      dropdown.classList.remove('is-active');
    };
  });

};