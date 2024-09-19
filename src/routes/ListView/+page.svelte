<script lang="ts">
	import ListView from '$lib/ListView/ListView.svelte';
	import { testHeader, testItems } from './test_data.js';
</script>

<ListView header={testHeader} items={testItems} />
