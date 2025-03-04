// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

// ██████   █████  ███    ██ ██████   ██████  ███    ███ ██ ███████ ███████ ██████      ███    ██ ███████ ████████ ██     ██  ██████  ██████  ██   ██ 
// ██   ██ ██   ██ ████   ██ ██   ██ ██    ██ ████  ████ ██    ███  ██      ██   ██     ████   ██ ██         ██    ██     ██ ██    ██ ██   ██ ██  ██  
// ██████  ███████ ██ ██  ██ ██   ██ ██    ██ ██ ████ ██ ██   ███   █████   ██████      ██ ██  ██ █████      ██    ██  █  ██ ██    ██ ██████  █████   
// ██   ██ ██   ██ ██  ██ ██ ██   ██ ██    ██ ██  ██  ██ ██  ███    ██      ██   ██     ██  ██ ██ ██         ██    ██ ███ ██ ██    ██ ██   ██ ██  ██  
// ██   ██ ██   ██ ██   ████ ██████   ██████  ██      ██ ██ ███████ ███████ ██   ██     ██   ████ ███████    ██     ███ ███   ██████  ██   ██ ██   ██ 
                                                                                                                                                                                                                                 
// ██████   █████  ██ ██      ██    ██     ██████  ██████   █████  ██     ██ 
// ██   ██ ██   ██ ██ ██       ██  ██      ██   ██ ██   ██ ██   ██ ██     ██ 
// ██   ██ ███████ ██ ██        ████       ██   ██ ██████  ███████ ██  █  ██ 
// ██   ██ ██   ██ ██ ██         ██        ██   ██ ██   ██ ██   ██ ██ ███ ██ 
// ██████  ██   ██ ██ ███████    ██        ██████  ██   ██ ██   ██  ███ ███                                                                                                                                                                                                                                   

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ERC677Receiver {
  function onTokenTransfer(address _sender, uint _value, bytes memory _data) external;
}

contract RNDDToken is Ownable, ERC20 {
    constructor() ERC20("Randomizer Network Daily Draw", "RNDD") {}

    mapping(address => bool) public DailyDrawGame;

    modifier onlyDailyDrawGame() {
      require(DailyDrawGame[_msgSender()] == true);
      _;
    }

    function setDailyDrawGame(address rnddAddress, bool status) public onlyOwner {
        DailyDrawGame[rnddAddress] = status;
    }

    function mint(address to, uint256 amount) public onlyDailyDrawGame {
      _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override onlyDailyDrawGame returns (bool) {
      _transfer(_msgSender(), to, amount);
      return true;
    }

    function burnFrom(address from, uint256 amount) public onlyDailyDrawGame {
      _burn(from, amount);
    }

    function burn(uint256 amount) public {
      _burn(_msgSender(), amount);
    }

    /**
    * @dev ERC677 transfer token to a contract address with additional data if the recipient is a contract.
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    * @param _data The extra data to be passed to the receiving contract.
    */
    function transferAndCall(address _to, uint _value, bytes memory _data) public returns (bool success) {
      require(_msgSender() != address(0), "ERC677: can't receive tokens from the zero address");
      require(_to != address(0), "ERC677: can't send to zero address");
      require(_to != address(this), "ERC677: can't send tokens to the token address");
      require(DailyDrawGame[_to] == true, "Transfers are only allowed in the Daily, Weekly, Monthly Draws.");

      _transfer(_msgSender(), _to, _value);
      emit Transfer(_msgSender(), _to, _value);

      if (isContract(_to)) {
        contractFallback(_to, _value, _data);
      }
      return true;
    }

    /**
    * @dev ERC677 function that emits _data to contract.
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    * @param _data The extra data to be passed to the receiving contract.
    */
    function contractFallback(address _to, uint _value, bytes memory _data) private {
      ERC677Receiver receiver = ERC677Receiver(_to);
      receiver.onTokenTransfer(msg.sender, _value, _data);
    }

    /**
    * @dev Helper function that identifies if receiving address is a contract.
    * @param _addr The address to transfer to.
    * @return hasCode The bool that checks if address is an EOA or a Smart Contract. 
    */
    function isContract(address _addr) private view returns (bool hasCode) {
      uint length;
      assembly { length := extcodesize(_addr) }
      return length > 0;
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner()));
    }
}
