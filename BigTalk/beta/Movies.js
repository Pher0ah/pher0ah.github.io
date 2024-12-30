const gameTitle = "أفلام";
const tableColour = 'bb0033';
const cardColour = 'ffffff';
const cardLogo = `url("https://play-lh.googleusercontent.com/8c0_Cp7NQo_a77ElA_CWuOIKxn200TtmnAupW8b_KxO1ExwMdCf3bfJnqmaMcj5qbCw=w240-h480-rw")`;

const theQuestions = [
  ["General","الأنسه حنفي<br>(1954)"],
  ["General","غبي منه فيه<br>(2004)"],
  ["General","اكس لارج<br>(2011)"],
  ["General","عسل أسود<br>(2010)"],
  ["General","عندما يقع الإنسان في مستنقع افكاره فينتهي به الأمر إلى المهزله<br>(2017)"],
  ["General","الأرض<br>(1970)"],
  ["General","العزيمة<br>(1939)"],
  ["General","المومياء<br>(1969)"],
  ["General","باب الحديد<br>(1958)"],
  ["General","شباب إمرآة<br>(1956)"],
  ["General","بداية و نهاية<br>(1960)"],
  ["General","سواق الأتوبيس<br>(1982)"],
  ["General","غزل البنات<br>(1949)"],
  ["General","الحرام<br>(1965)"],
  ["General","البوسطجي<br>(1968)"],
  ["General","رد قلبي<br>(1957)"],
  ["General","دعاء الكروان<br>(1958)"],
  ["General","الناصر صلاح الدين<br>(1963)"],
  ["General","اللص و الكلاب<br>(1962)"],
  ["General","الزوجة الثانية<br>(1967)"],
  ["General","أم العروسة<br>(1963)"],
  ["General","شئ من الخوف<br>(1969)"],
  ["General","الطوق و الإسورة<br>(1986)"],
  ["General","أريد حلا<br>(1975)"],
  ["General","لاشين<br>(1938)"],
  ["General","في بيتنا رجل<br>(1961)"],
  ["General","الكيت كات<br>(1991)"],
  ["General","صراع في الوادي<br>(1954)"],
  ["General","جعلوني مجرما<br>(1954)"],
  ["General","ريا و سكينة<br>(1953)"],
  ["General","البريء<br>(1986)"],
  ["General","ميرامار<br>(1969)"],
  ["General","زوجة رجل مهم<br>(1987)"],
  ["General","السقا مات<br>(1979)"],
  ["General","إسكندرية ليه<br>(1978)"],
  ["General","زوجتي و الكلب<br>(1971)"],
  ["General","السوق السوداء<br>(1945)"],
  ["General","مراتي مدير عام<br>(1966)"],
  ["General","أحلام هند و كاميليا<br>(1988)"],
  ["General","أهل القمة<br>(1981)"],
  ["General","حياة أو موت<br>(1954)"],
  ["General","الكرنك<br>(1975)"],
  ["General","زائر الفجر<br>(1973)"],
  ["General","النائب العام<br>(1946)"],
  ["General","درب المهابيل<br>(1955)"],
  ["General","ليل و قضبان<br>(1973)"],
  ["General","على من نطلق الرصاص<br>(1975)"],
  ["General","لك يوم يا ظالم<br>(1951)"],
  ["General","ثرثرة فوق النيل<br>(1971)"],
  ["General","صراع الأبطال<br>(1962)"],
  ["General","عودة الإبن الضال<br>(1976)"],
  ["General","المهاجر<br>(1994)"],
  ["General","الإختيار<br>(1970)"],
  ["General","ليه يا بنفسج<br>(1993)"],
  ["General","العار<br>(1982)"],
  ["General","خرج ولم يعد<br>(1984)"],
  ["General","بين السما و الأرض<br>(1959)"],
  ["General","غروب و شروق<br>(1970)"],
  ["General","للحب قصة أخيرة<br>(1986)"],
  ["General","أمير الإنتقام<br>(1950)"],
  ["General","المستحيل<br>(1965)"],
  ["General","قنديل أم هاشم<br>(1968)"],
  ["General","المذنبون<br>(1975)"],
  ["General","رصاصة في القلب<br>(1944)"],
  ["General","أغنية على الممر<br>(1972)"],
  ["General","المراهقات<br>(1960)"],
  ["General","الحب فوق هضبة الهرم<br>(1986)"],
  ["General","يوميات نائب في الأرياف<br>(1969)"],
  ["General","الوحش<br>(1954)"],
  ["General","سوبر ماركت<br>(1990)"],
  ["General","امرأة في الطريق<br>(1958)"],
  ["General","بين الأطلال<br>(1959)"],
  ["General","أبناء الصمت<br>(1974)"],
  ["General","الصعود إلى الهاوية<br>(1978)"],
  ["General","سلامة في خير<br>(1937)"],
  ["General","الأيدي الناعمة<br>(1964)"],
  ["General","المتمردون<br>(1968)"],
  ["General","خلي بالك من زوزو<br>(1972)"],
  ["General","الأفوكاتو<br>(1984)"],
  ["General","سي عمر<br>(1941)"],
  ["General","ابن النيل<br>(1951)"],
  ["General","أيامنا الحلوة<br>(1955)"],
  ["General","حدوتة مصرية<br>(1982)"],
  ["General","زينب<br>(1952)"],
  ["General","صراع في النيل<br>(1959)"],
  ["General","وا إسلاماه<br>(1962)"],
  ["General","أبي فوق الشجرة<br>(1969)"],
  ["General","إمبراطورية ميم<br>(1972)"],
  ["General","اللعب مع الكبار<br>(1991)"],
  ["General","غرام و إنتقام<br>(1944)"],
  ["General","المنزل رقم 13<br>(1952)"],
  ["General","الخطايا<br>(1962)"],
  ["General","الجبل<br>(1965)"],
  ["General","السمان و الخريف<br>(1967)"],
  ["General","بين القصرين<br>(1964)"],
  ["General","أنا حرة<br>(1952)"],
  ["General","الرجل الذي فقد ظله<br>(1968)"],
  ["General","دنانير<br>(1940)"],
  ["General","الزوجة 13<br>(1962)"],
  ["General","الرصاصة لا تزال في جيبي<br>(1974)"],
  ["General","احنا بتوع الاتوبيس<br>(1979)"],
  ["General","مطاردة غرامية<br>(1968)"],
  ["General","مرجان أحمد مرجان<br>(2007)"],
  ["General","ليلة سقوط بغداد<br>(2005)"],
  ["General","التجربة دنماركية<br>(2003)"],
  ["General","بوبوس<br>(2009)"],
  ["General","عمارة يعقوبيان<br>(2006)"],
  ["General","الهلفوت<br>(1985)"],
  ["General","السفارة في العمارة<br>(2005)"],
  ["General","عريس من جهة أمنية<br>(2004)"],
  ["General","بخيت و عديلة<br>(1995)"],
  ["General","طيور الظلام<br>(1995)"],
  ["General","شمس الزناتي<br>(1991)"],
  ["General","الإرهاب و الكباب<br>(1992)"],
  ["General","النوم في العسل<br>(1996)"],
  ["General","رسالة إلى الوالي<br>(1998)"],
  ["General","المنسي<br>(1993)"],
  ["General","عنتر شايل سيفه<br>(1984)"],
  ["General","عصابة حمادة و توتو<br>(1982)"],
  ["General","طير أنت<br>(2009)"],
  ["General","لا تراجع ولا إستسلام<br>(2010)"],
  ["General","<br>(0000)"]
];