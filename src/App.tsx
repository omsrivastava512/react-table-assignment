/**
 * 
 */
import React, { useState, useEffect, useRef, ChangeEvent, MouseEvent  } from 'react';
import { DataTable, DataTableSelectionChangeEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputSwitch, InputSwitchChangeEvent } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
        

/** Interfaces Start */
    interface ApiResponse {
        data: Title[];
        pagination: Pagination;
    }

    interface Pagination {
        total: number;
        limit: number;
        offset: number;
        total_pages: number;
        current_page: number;
        prev_url: string;
        next_url: string;
    }

    interface Title {
        id: number;
        title: string;
        place_of_origin: string;
        artist_display: string;
        inscriptions: string;
        date_start: number;
        date_end: number;
    }
/** Interfaces End  */



export default function App() {
    const [titles, setTitles] = useState<Title[]>([]);        
    /** Selected rows are remembered because selectedTitles is gloabl to DataTable */
    const [selectedTitles, setSelectedTitles] = useState<Title[] | null>(null);
    /** For pagination and table render */
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rowClick, setRowClick] = useState<boolean>(true);
    
    const op = useRef<OverlayPanel>(null)
    const debounceTimeout = useRef<number | undefined>(undefined); 

    /** Storing the desired field name to later use in maping **/
    const fields : string[] = ["title", "place_of_origin", "artist_display", "inscriptions", "date_start", "date_end"];
    const headers : string[] = fields.map(field => field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')) // capitalising the fields

    
    useEffect(()=>{
        updateTableStates(1);
        },[])

    /** Just a regular fetch function **/
    const fetchData = async (page: number, limit:number): Promise<{ titles: Title[], pagination: Pagination}> => {
        console.log("Limit: "+limit);
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${limit??12}`);
            if (!response.ok) {
                throw new Error('Ugh! It\'s not me. It\s the backend folks. I swear.');
            }
            const data: ApiResponse = await response.json();

            console.log("Current Page: " + page);
            const filteredData: Title[] = data.data.map((record: Title) => {
                /** Why even store all those keys? **/
                const { id, title, place_of_origin, artist_display, inscriptions, date_start, date_end } = record;
                return { id, title, place_of_origin, artist_display, inscriptions, date_start, date_end };
            });
            return { titles: filteredData, pagination: data?.pagination };
        } catch (error) {
            setError((error as Error).message);
            return { 
                titles: [], 
                pagination: {
                    total: 0, 
                    limit: 0, 
                    offset: 0, 
                    total_pages: 0, 
                    current_page: 0, 
                    prev_url: '', 
                    next_url: ''
                }
            };
        } finally {
            setLoading(false);
        }
    };

    /** Updating states used in DataTable  **/
    const updateTableStates = async(page:number):Promise<void> => {
        setLoading(true);
        const {titles, pagination} = await fetchData(page,12);
        console.log(titles)
        setTitles(titles);
        setPagination(pagination);
    }
    
    /** Custom Selector Handler */
    const rowSelectorHandler = async (e: ChangeEvent<HTMLInputElement>):Promise<void> => {
        const newValue:number = parseInt(e.target?.value)|| 0;

        /** API Limitation */
        if(newValue>100) alert("Can not select more than 100 records at once")
    
        /**  Clear the previous timeout */
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = window.setTimeout(async():Promise<void> => {
          
          if(newValue!=0 && newValue<=100){
              const {titles} = await fetchData(1,newValue);
              console.log(titles)
              setSelectedTitles(titles);
          }
          else setSelectedTitles(null);
        },500); 
    }


    if (loading) return <h1>Loading...</h1>;
    if (error) return <h1>Error: {error}</h1>;

    return (
        <div className="card">
            <DataTable 
                value={titles} 
                paginator 
                    rows={ pagination?.limit} 
                    totalRecords={pagination?.total ?? 0}  
                    emptyMessage="No records found"
                    paginatorTemplate="PrevPageLink PageLinks NextPageLink"
                    lazy
                    onPage={(e)=>updateTableStates(e.page + 1)}
                    first={pagination?.offset}
                selectionMode={rowClick ? undefined : 'multiple'} 
                selection={selectedTitles!}
                onSelectionChange={(e) => setSelectedTitles(e.value)} dataKey="id" tableStyle={{ minWidth: '50rem' }}
                >
                    

                    
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}
                    header = <div style={{margin:'0 5px 0 0'}}>
                        <Button size= 'small' type="button" icon="pi pi-angle-down"onClick={(e) => op.current.toggle(e)} />

                        <OverlayPanel ref={op}>
                        <InputText type="number" className="p-inputtext-sm"  placeholder="Enter number of rows"
                        onChange={rowSelectorHandler} />

                        </OverlayPanel>
                     </div>    
                    >
                        

                    </Column>
                    
            

                    {fields.map((field, index) => (
                        <Column key={index} field={field} header={headers[index]} />
                    ))}
            </DataTable>


        </div>
    );
}
        