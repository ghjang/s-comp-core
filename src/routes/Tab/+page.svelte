<script lang="ts">
	//import Floor from '$lib/Floor/Floor.svelte';

	import Tab from '$lib/Tab/Tab.svelte';
	import TextBlock from './TextBlock.svelte';

	const tabs = [
		{
			label: 'Text Block 1',
			component: TextBlock,
			props: { text: '이것은 첫 번째 텍스트 블록입니다. 여기에 더 많은 내용을 추가할 수 있습니다.' }
		},
		{
			label: 'Text Block 2',
			component: TextBlock,
			props: {
				text: '두 번째 텍스트 블록에 오신 것을 환영합니다. 이 블록은 다양한 정보를 포함할 수 있습니다.'
			}
		},
		{
			label: 'Text Block 3',
			component: TextBlock,
			props: {
				text: '세 번째이자 마지막 텍스트 블록입니다. 여기에서 중요한 결론을 제시할 수 있습니다.'
			}
		}
	];

	function handleTabSelected(event: CustomEvent) {
		console.log('tabSelected', event.detail);
	}
</script>

<Tab selectedTabIndex={0} {tabs} on:tabSelected={handleTabSelected} />
