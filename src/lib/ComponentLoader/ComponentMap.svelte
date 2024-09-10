<script context="module">
  // NOTE: '모듈' 컨텍스트 스크립트 블럭에서 역시 'export' 키워드를 사용할 수 있다.
  //       이때의 의미는 번들링되는 모듈 '.js' 파일에서 해당 변수를 'export'로 노출한다는
  //       자바스크르립트 모듈 시스템의 원래 의미와 동일하다.
  //
  //       예를 들어서 다음과 같이 객체 변수를 export하면:
  //          export const classMap = {};
  //       번들링된 '.js' 파일에서 다음과 같이 해당 변수를 사용할 수 있다:
  //          import { classMap } from './ComponentMap.js';
  //
  //       '스벨트' 코드에서 '모듈' 컨텍스트 스크립트 블럭이 아닌 곳에서 사용된 'export' 키워드는
  //       일반적인 자바스크립트 모듈 시스템의 'export' 키워드와는 다른 의미라는 점을 주의해야 한다.
  //       '스벨트' 컴파일러가 그러한 'export' 키워드를 '컴포넌트 클래스의 속성 또는 메쏘드'로
  //       해석하고, 해당 컴포넌트를 사용하는 코드에서 해당 속성 또는 메쏘드를 사용할 수 있도록
  //       컴파일한다.
  //
  //       먼저 예로 들었던 'classMap'과 함께 'default'로 노출되는 '컴포넌트 클래스'를 동시에
  //       'import'하는 방법은 다음과 같다:
  //          import ComponentMap, { classMap } from './ComponentMap.js';
  //       'default'로 노출된 이름은 '임의로 지정'할 수 있다. 'module.defalt'로 노출된 이름을
  //       단순히 'ComponentMap'로 'alias'하는 것일 뿐이다. 때문에 아무런 이름으로 다음과 같이
  //       'import'할 수도 있다:
  //           import WrongName, { classMap } from './ComponentMap.js';
  //       가능하면 원래의 이름을 사용하는 것이 좋겠다.
  //
  //
  //       '웹페이지내'의 자바스크립트 모듈 시스템의 '모듈 스코프'는 '동일한 웹페이지'내에서
  //       같은 '모듈' 파일을 사용할 경우 그 페이지내에서 '1회 로딩, 1회 실행'되는 것을 보장한다.
  //       따라서 '모듈'에서 'export'로 노출된 '전역 성격'의 변수 따위를 '동일한 웹페이지'내의
  //       다른 '직접적/간적적 스크립트, 다른 script 블럭, 다른 스벨트 컴포넌트에서 공유해 사용할 수 있다.
  //
  //       주의할 점은 'primitive type'의 변수rk 'export'로 노출된 경우 'import'시에
  //       값이 복사되어 전달되므로 'import'된 변수의 값을 변경해도 모듈내의 그 변수값은 변경되지 않는다.
  //       하지만 '객체, 배열' 등의 '참조 타입'의 변수를 export하고 import한 경우에는 '참조'가
  //       전달되므로 'import'된 변수의 값을 변경하면 모듈내의 그 변수값도 변경된다.
  //
  //       별도의 '.js' 파일이 아니라 'HTML' 파일 자체내에서 'script type="module"'로 선언된
  //       스크립트 블럭역시 '모듈 스코프'를 가진다. 따라서 1개의 'HTML' 파일 내에서 '모듈 스코프'를
  //       가진 여러 스크립트 블럭이 있을 경우 각각의 블럭에 선언된 변수들은 서로 공유할 수 없다.
  //       또한 이런 웹페이지에 인라인된 모듈 스크립트 블럭에서는 'export' 키워드를 사용해 변수등을
  //       외부로 노출할 수 없다.

  const classMap = {};
</script>

<script>
  export const getNumberOfRegisteredComponents = () =>
    Object.keys(classMap).length;

  export const getRegisteredComponentNames = () => Object.keys(classMap);

  export const getRegisteredComponentClasses = () => Object.values(classMap);

  export const getRegisteredComponent = (className) => classMap[className];

  export const registerComponent = (...args) => {
    let className; // 클래스 이름 문자열
    let classReference; // 클래스 레퍼런스

    if (args.length === 1) {
      // 단일 인자 제공 시, 클래스 레퍼런스의 이름을 키로 사용
      classReference = args[0];

      if (!classReference.name) {
        throw new Error(`Class name is not defined: ${classReference}`);
      }

      className = classReference.name;
    } else if (args.length === 2) {
      // 두 개의 인자 제공 시, 첫 번째 인자를 클래스 이름 키로 사용
      [className, classReference] = args;
    } else {
      throw new Error(`Invalid arguments provided to registerClass: ${args}`);
    }

    if (getRegisteredComponent(className)) {
      throw new Error(`Class '${className}' is already registered`);
    }

    classMap[className] = classReference;

    return classReference;
  };

  export const unregisterComponent = (className) => {
    if (!getRegisteredComponent(className)) {
      throw new Error(`Class '${className}' is not registered`);
    }

    delete classMap[className];
  };

  export const createComponent = (className, props, targetElement) => {
    const Class = classMap[className];
    if (Class) {
      return new Class({
        target: targetElement,
        props,
      });
    } else {
      throw new Error(`Class '${className}' not found`);
    }
  };
</script>
