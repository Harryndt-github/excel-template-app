// Debug script - post fix
const fs = require('fs');

let masterWardsCode = fs.readFileSync('./data/master-wards-2025.js', 'utf8')
  .replace('const MASTER_WARDS_2025', 'var MASTER_WARDS_2025');
let addressDataCode = fs.readFileSync('./js/address-data.js', 'utf8')
  .replace('const VietnamAddressData', 'var VietnamAddressData');
let parserFullCode = fs.readFileSync('./js/address-parser.js', 'utf8');
let parserCode = parserFullCode.substring(0, parserFullCode.indexOf('const AddressParserUI'))
  .replace('const AddressParser', 'var AddressParser');

const code = masterWardsCode + '\n' + addressDataCode + '\n' + parserCode + `

// Test case 1: The bug case
console.log('=== TEST 1: Original bug case ===');
var r1 = AddressParser.parseAddress('45/5 Than Thai Tong, Pthanh Xuan, THEO DIA CHI MOI, Q Hai Ba Trung, Hnoi');
console.log('  province:', r1.province, r1.province === 'Hà Nội' ? '✅' : '❌ EXPECTED: Hà Nội');
console.log('  district:', r1.district);
console.log('  ward:', r1.ward);
console.log('  street:', r1.street);

// Test case 2: Still works for normal HCM
console.log('\\n=== TEST 2: Normal HCM ===');
var r2 = AddressParser.parseAddress('45/5 Than Thai Tong, P15, Q. Tan Binh, TP. HC');
console.log('  province:', r2.province, r2.province === 'Hồ Chí Minh' ? '✅' : '❌');
console.log('  district:', r2.district);
console.log('  ward:', r2.ward);

// Test case 3: Real Huyện should still work
console.log('\\n=== TEST 3: Real Huyện ===');
var r3 = AddressParser.parseAddress('Xã ABC, H. Bình Chánh, HCM');
console.log('  province:', r3.province);
console.log('  district:', r3.district, r3.district.includes('Bình') ? '✅' : '❌');

// Test case 4: Q Hai Ba Trung
console.log('\\n=== TEST 4: District Q Hai Ba Trung ===');
var r4 = AddressParser.parseAddress('123 Le Loi, Q Hai Ba Trung, Hnoi');
console.log('  province:', r4.province, r4.province === 'Hà Nội' ? '✅' : '❌');
console.log('  district:', r4.district);

// Test case 5: Other addresses from screenshot
console.log('\\n=== TEST 5: Other addresses ===');
var r5 = AddressParser.parseAddress('88A Dien Bien Phu, P.Thuan Hoa, DIA DANH HANH');
console.log('  street:', r5.street);
console.log('  ward:', r5.ward);

var r6 = AddressParser.parseAddress('221 ng t minh khai, P. Nha Trang, DI A DANH H');
console.log('  street:', r6.street);
console.log('  ward:', r6.ward);
console.log('  province:', r6.province);
`;

eval(code);
